const mongoose = require("mongoose");
const {instance} = require("../config/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utiils/mailSender");
const {courseEnrollmentEmauil} = require("../mail/templates/courseEnrollmentEmail");

//capture the payment and initiate the razorpay order
exports.capturePayment = async (req, res) => {
         // get courseId and UserId
       const {course_id} =req.body;
       const userId = req.user.id;
       //validation
       //valid courseID
       if(!course_id){
        return res.json({
            succesS:false,
            message:"Please provide valid courseId",
        });
       };

       //valid courseEmail

       let course;
       try{
          course = await Course.findById(course_id);
          if(!course) {
            return res.json({
                success:false,
                message:"Could not find the course",
            });
          }
         //user already pay for the same course
         const uid = new mongoose.Types.ObjectId(userId);
         if(course.studentsEnrolled.includes(uid)) {
           return res.status(200).json({
            success:false,
            message:"Student is already enrolled",
           });
         
        }

       } catch(error){
          console.error(error);
          return res.status(500).json({
            success:false,
            message:error.message,
          })
       }
       
       //order create
       const amount = course.prependOnceListener;
       const currency = "INR";
       const options = {
        amount: amount*100,
        currency,
        reciept:Math.random(Date.now().toString),
        notes:{
          courseId: course_id,
          userId,
        }   
    
    };
      try{
        //initiate the payment using razorpay
        const paymentResponse = await instance.orders.create(options);
        console.log(paymentResponse);

        //return response
        return res.status(200).json({
              success:true,
              courseName:course.courseName,
              courseDescription:course.courseDescription,
              thumbnail:course.thumbnail,
              orderId: paymentResponse.id,
              currency:paymentResponse.currency,
              amount:paymentResponse.amount,
        });
      }  catch(error) {
        console.log(error);
        res.status({
            success:false,
            message:error.message,
        });
      }  

       

   
};

//verify signature of Razorpay and Server
exports.verifySignature = async (req, res) => {
    const webhookSecret = "12345678";

    const signature = req.headers("x-razorpay-signature");
 
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if(signature === digest) {
        console.log("Payment is Authorized");
        
        const {courseId, userId} = req.body.payload.payment.entity.notes;

        try{
           //fulfil the action

           //find the course and enroll the student in it
           const enrolledCourse = await Course.findOneAndUpdate(
                                                            {_id: courseId},
                                                          {$push:{studentEnrolled: userId}},
                                                          {new:true},
           );
           
           if(!enrolledCourse) {
            return res.status(500).json({
                success:false,
                message:"Course Not Found",
            });
           }
        console.log(enrolledCourse);

        //find the student and add course to the list of enrolled course
         const enrolledStudent = await User.findOneAndUpdate(
                                                         {_id: userId},
                                                         {$push:{course:courseId}},
                                                         {new:true},
         );
         console.log(enrolledStudent);
         //mail send kro confirmation wala
         const emailResponse = await mailSender(
                                    enrolledStudent.email,
                                    "Congratulation from codehelp",
                                    "Congratulations you are onboarded into new codehelp course",

         );
         console.log(emailResponse);

         return res.status(200).json({
            success:true,
            message:"Signature Verified and course added",
         });
        } catch(error) {
           console.log(error);
           return res.status(500).json({
            succesS:false,
            message:error.message,
           });
        }
       
    }
    else {
        return res.status(400).json({
            success:false,
            message:"Invalid request",
        })
    }
};