const Profile = require("../models/Profile");
const User = require("../models/User");

exports.updateProfile = async (req, req) => {
    try{
        //get data
        const {dateOfBirth="", about="", contactNumber, gender} = req.body;

        //getUserId
        const id = req.user.id;

        //validation
        if(!contactNumber || !gender || !id){
            return resizeBy.status(400).json({
                success:false,
                message:"All fields are required",
            });
        }
        //find profile
        const userDetails = await User.findById(id);
        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId);
        
        //update profile
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.gender = gender;
        profileDetails.about =about;
        profileDetails.contactNumber = contactNumber;
        await profileDetails.save();
        //return  response
        return res.status(200).json({
            success:true,
            message:"Profile Updated Succcessfully",
            profileDetails,
        });

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:"Somenthing went wrong",
            error:error.message,
        });
    }
}

//deleteAccount
exports.deleteAccount = async (req, res) => {
    try{ 
        //fetch id
        const id = req.user.id;
        //validation
        const userDetails = await User.findById(id);
        if(!userDetails) {
            return res.status(500).json({
                success:false,
                message:"User not found",
            })
        }
        //delete profile
        await Profile.findByIdAndDelete({_id:userDetails.additionalDetails});
        //hw -> unerolled user from all enrolled user


        //delete user
        await User.fimdByIdAndDelete({_id:id});

       
        //return response
        return res.status(200).json({
            success:true,
            message:"User deleted successully",
        });

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:"User cannot be deleted successfully",
        })
      
    }
}
//explore-> how can be schedule this deletion operation




exports.getAllUserDetails = async (req, res) => {
    try{
        //fetch id
        const id = req.user.id;
        //validation
      
        //get user details using db call
        const userDetails = await User.findById(id).populate("additionalDetails").exec();
        //return response
        return res.status(200).json({
            succesS:true,
            message:"User Data fetched Successfully",
        })
    } catch(error) {
        return res.status(500).json({
            success:false,
            error:error.message,
        });

    }
}