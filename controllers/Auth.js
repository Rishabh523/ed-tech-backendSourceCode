const  User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
require("dotenv").config();







//signup
exports.signup = async (req,res) => {
    try{
      //data fetch from req body
      const {
        firstName,
        lastName,
        email, 
        password,
        confirmPassword,
        accountType,
        contactNumber,
        otp } = req.body;

      //data validation
      if(!firstName  || 
        !lastName || 
        !email || 
        !password || 
        !confirmPassword || 
        !otp)
      {
        return res.status(403).json({
            success:false,
            message:"All fields are required",
        });
      }

      // 2 password match kr lo
      if(password !== confirmPassword){
        return res.status(400).json({
            success:false,
            message:"Password and ConfirmPassword value do not match, please try again",
        });
      }

      //check user already exist or not
      const existingUser = await User.findOne({email});
       if(existingUser) {
        return res.status(400).json({
            success:false,
            message:"User is already registered",
        });
      }

      //find most recent OTP stored for the user
      const response = await OTP.find({ email }).sort({ createdAt: -1}).limit(1);
      console.log(response);

      //validate OTP
      if(response.length == 0) {
        return res.status(400).json({
            success:false,
            message:"OTP NOT found",
        })
      }
      else if(otp !== response[0].otp) {
        //invalid otp
        return res.status(400).json({
            success:false,
            message:"Invalid OTP",
        });
      }

      //Hash password
      const hashedPassword =  await bcrypt.hash(password, 10);
      

      //create entry in db 

       const profileDetails = await Profile.create({
        gender:null,
        dateOfBirth:null,
        about:null,
        contactNumber:null,
       })

      const user = await User.create({
        firstName,
        lastName,
        email,
        contactNumber,
        password:hashedPassword,
        accountType,
        additionalDetails: profileDetails,
        image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
      })

      //return res
      return res.status(200).json({
        success:true,
        messgae:"User is registered successfully",
        user,
    })
  } catch(error) {
    console.log(error)
    return res.status(500).json({
        success:false,
        message:"User cannot registered please try again",
    })
  }
}

//sendOTP
exports.sendotp = async (req,res) => {
    try{
        //fetch email from request ki body
       const { email } = req.body;

       // check if user already present
       const checkUserPresent = await User.findOne({email});
       
       //if user already exist, then return a response
       if(checkUserPresent) {
        // Return 401 Unauthorized status code with error message
        return res.status(401).json({
            success:false,
            messge:`User is Already Registered`,
        });

       }

       //generate otp
       var otp = otpGenerator.generate(6, {
        upperCaseAlphabets:false,
        lowerCaseAlphabets:false,
        specialChars:false,
       });
       console.log("OTP generated:", otp);

       //check unique otp or not
       const result = await OTP.findOne({otp: otp});
       console.log("Result is Generate OTP Func");
	   console.log("OTP", otp);
	   console.log("Result", result);

       while(result) {
          otp = otpGenerator(6, {
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
          });
          result = await OTP.findOne({otp: otp});
       }

       const otpPayload = {email, otp};
       
       //create an entry in db for OTP
       const otpBody = await OTP.create(otpPayload);

       //return response successfull
       res.status(200).json({
        success:true,
        message:"OTP sent Successfully",
        otp,
       })

    } catch(error) {
        console.log(error);
        return res.status(500).json({
          success:false,
          message:error.message,
        })
    }
}







//login
exports.login = async (req,res) => {
    try{
        //get data from request body
        const { email, password } = req.body;

        //validation of data
        if(!email || !password){
            return res.status(403).json({
                success:false,
                message:"All fields are required, please try again",
            });
        }

        //user check exist or not
        const user = await User.findOne({email}).populate("additionalDetails");

        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered, please register first",
            });
        }

        //generate jwt after password matching
        if(await bcrypt.compare(password, user.password)){
            const token = jwt.sign(
                {
                    email:user.email,
                    id: user._id,
                    accountType:user.accountType,
                   }, 
                   process.env.JWT_SECRET,
                   {
                     expiresIn:"24h",
                  }
           );
           
           
            
           //problem
           
           user.token = token;
           user.password = undefined;

        
        
        //create cookie and send response
        const options = {
            expires: new Date(Date.now() + 3*24*60*60*1000),
            httpOnly:true,
        }
        res.cookie("token", token, options).status(200).json({
            succes:true,
            token,
            user,
            message:"Logged in successfully",
        })
    }  
    else{
        return res.status(401).json({
            success:false,
            message:"Password do not match",
        });
    }

    } catch(error) {

        console.error(error);
        return res.status(500).json({
            success:false,
            message:"Login failure please try again",
        })
    }
}


//changePASSWORD

exports.changePassword = async (req,res) => {
    try{
    //get data from req body
    const {id, oldPassword, newPassword, confirmNewPassword} = req.body;
    //get oldpassword, newPassword, confiirmnewPassword
    const userDetails = await User.findById(id);

    //validation of old password
    const isPasswordMatch = await bcrypt.compare(oldPassword, userDetails.password);
    if(!isPasswordMatch) {
       return res.status(401).json({
        success:false,
        mesaage:"The password is incorrect",
       })
    }
    //match new password and confirm new password
    if(newPassword !== confirmNewPassword){
        return res.status(400).json({
            success:true,
            mesaage:"The password and the confirm password does not match",
        });
    }
    //update password in db
    const encryptPassword = await bcrypt.hash(newPassword, 10);
    const updatedPassword= await findByIdAndUpdate(id, 
                                                  {password: encryptPassword}, 
                                                   {new:true});

    //send mail -password updated
    try{
        const emailResponse = await mailSender(
            updatedUserDetails.email,
            passwordUpdated(
                updatedUserDetails.email,
            `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        )
    );
       console.log("Email sent successfully:", emailResponse.response);
    } catch(error) {
       // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			}); 
    }
    //return response
    return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
    }
};
