const User = require("../models/User");
const mailSender =require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

//resetPasswordToken
exports.resetPasswordToken = async (req, res) => {
    try{
        //get email from req body
        const {email} = req.body;
        //check user for this email, email verification
        const user = await User.findOne({email: email});
        if(!user){
            return res.json({
                success:false,
                message:`This Email: ${email} is not Registered With Us Enter a Valid Email `,
            })
        }
        //generate token
        const token = crypto.randomUUID();
        //update user by adding token and expiration time
        const updatedDetails = await User.findOneAndUpdate(
                                         {email: email},
                                         {
                                            token:token,
                                            resetPasswordExpires: Date.now() + 5*60*1000,
                                         },
                                         {new:true} //with new:true updated details returns, otherwise old details may also get returns   
        );
        //create url
        const url =`http://localhost:3000/update-password/${token}`
        //send mail containing an url
        await mailSender(email, 
                        "Password Reset Link",
                        `Your Link for email verification is ${url}. Please click this url to reset your password.`
                        );
        //return response
        res.json({
            success:true,
            message:"Email sent successfully, please check email and change password",
        });
        


    } catch(error) {
        console.log(error);
    return res.status(500).json({
        success:false,
        message:`Some Error in Sending the Reset Message`,
    });
    }
};


//reset Password
exports.resetPassword = async (req, res) => {
    try{
       //fetch data
       const {token, password, confirmPassword} = req.body;
       //validation
       if(password !== confirmPassword) {
        return res.json({
            success:false,
            message:"Passord and confirm Password is not matched",
        }); 
       }
       //get user details from db using token
       const userDetails = await User.findOne({token});
       //entry not found => invalid token
       if(!userDetails) {
        return resjson({
            success:false,
            message:"Token is Insvalid",
        });
       }
       //token time check
       if(userDetails.resetPasswordExpires < Date.now()) {
        return res.json({
            success:false,
            message:"Token is expired, please regenerate your token",
        });
       }
       //hash password
       const hashedPassword = await bcrypt.hash(password, 10);
       //password update
       await User.findOneAndUpdate(
                  {token:token},
                  {password:hashedPassword},
                  {new:true},
       );
       //return response
       return res.status(200).json({
        success:true,
        message:"Password reset successfully",
       });

    } catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Something went wrong while reseting the token",
           });
    }
}
