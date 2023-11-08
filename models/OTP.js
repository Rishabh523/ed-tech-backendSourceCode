const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");

const OTPSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
    },
    otp:{
        type:String,
        required:true,
    },
    createdAt:{
        type:Date,
        default:Date.now(),
        expires: 5*60,  // The document will be automatically deleted after 5 minutes of its creation time
    },
});

// functin => send email

async function sendVerificationEmail(email, otp){
    // Create a transporter to send emails

	// Define the email options
    

	// Send the email
    try{
        const mailResponse = await mailSender(email,"Verification Email from StudyNotion", otp);
        console.log("Email Sent Successfully", mailResponse);
    } catch(error){
       console.log("Error Occured while sending mail", error);
       throw error;
    }
}

// Define a pre-save hook to send email after the document has been saved
OTPSchema.pre("save", async function(next) {
    await sendVerificationEmail(this.email, this.otp);
    next();
})

module.exports = mongoose.model("OTP", OTPSchema);