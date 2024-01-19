const mongoose = require("mongoose");
const {instance} = require("../confIg/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail} = require("../mail/templates/courseEnrollmentEmail");
const crypto = require("crypto");

//capture the payment and initiate the razorpay order
exports.capturePayment = async(req, res) => {

    const {courses} = req.body;
    const userId = req.user.id;

    if(courses.length === 0) {
      return res.json({
        success:false,
        message:"Please provide the courseId",
      })
    }

    let totalAmount = 0;
    for(const course_id of courses) {
      let course;
      try{
        course = await Course.findById(course_id);
        if(!course){
            return res.status(200).json({
                success:false,
                message:"Could not find the course",
            })
        }
        
        const uid = new mongoose.Types.ObjectId(userId);
        if(course.studentsEnrolled.includes(uid)){
            return res.status(200).json({
                success:false,
                message:"Student is already Enrolled"
            });
          
        }
        totalAmount += course.price;
      } catch(error) {
            console.log(error);
            return res.status(500).json({
                success:false,
                message:error.message,
            })
      }
    }
    const currency = "INR";
    const options = {
        amount: totalAmount * 100,
        currency,
        receipt:Math.random(Date.now()).toString(),
    }
    try{
        const paymentResponse =  await instance.orders.create(options);
        res.status({
            success:true,
            message:paymentResponse,
        })
    } catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Could not Intiate Order",
        })
    }

}

//verify the payment
exports.verifyPayment = async (req,res) => {
    const razorpay_order_id = req.body?.razorpay_order_id;
    const razorpay_payment_id = req.body?.razorpay_payment_id;
    const razorpay_signature = req.body?.razorpay_signature;
    const courses = req.body?.courses;
    const userId = req.user.id;


    if(!razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        ! courses ||
        ! userId) {
            return res.status(200).json({
                success:false,
                message:"Payment Failed"
            });
        }
        let body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex");

        if(expectedSignature === razorpay_signature) {
           //enroll karwao student ko
           await enrollStudents(courses, userId, res);
           //retrun res
           return res.status(200).json({
            success:true,
            message:"Payment Verified",
           });
        }
        return res.status(200).json({
            success:"false",
            message:"Paymenyt Failed",
        })
}

const enrollStudents = async(courses, userId, res) => {
        
            if(!courses || !userId) {
                return res.status(400).json({
                    success:false,
                    message:"Please provide data for Courses or UserId"
                });
             }
             for(const courseId of courses) {
                //find the course and enroll the students
                try{
                const enrolledCourse = await Course.findOneAndUpdate(
                    {_id:courseId},
                    {$push:{studentsEnrolled:userId}},
                    {new: true},
                ) 
                if(!enrolledCourse) {
                    return res.status(500).json({
                        success:false,
                        message:"Course not Found"
                    })
                }
    
                //find the students and add the course to their list of enrolled Courses
                const enrolledStudent = await User.findByIdAndUpdate(userId,
                    {
                        $push:{
                            courses:courseId,
                        }
                    }, 
                    {new:true})
                // send mail to student through the nmail sender
                const emailResponse = await mailSender(
                    enrollStudents.email,
                    `Successfully Enrolled into ${enrolledCourse.courseName}`,
                    courseEnrollmentEmail(enrolledCourse.courseName, `${enrolledStudent.firstName}`)
                    )
                    console.log("Email Sent Successfull", emailResponse.response);
                } catch(error) {
                    console.log(error);
                    return res.status(500).json({
                        success:false,
                        message:error.message
                    });
                }
             }
       
}

exports.sendPaymentSuccessEmail = async(req, res) => {
    const {orderId, paymentId, amount} = req.body;

    const userId = req.user.id;

    if(!orderId || !paymentId || !amount || !userId) {
        return res.status(400).json({success:false, message:"Please provide all the fields"});
    }

    try{
        //student ko dhundo
        const enrolledStudent = await User.findById(userId);
        await mailSender(
            enrolledStudent.email,
            `Payment Recieved`,
             paymentSuccessEmail(`${enrolledStudent.firstName}`,
             amount/100,orderId, paymentId)
        )
    }
    catch(error) {
        console.log("error in sending mail", error)
        return res.status(500).json({success:false, message:"Could not send email"})
    }
}


// exports.capturePayment = async (req, res) => {
//          // get courseId and UserId
//        const {course_id} =req.body;
//        const userId = req.user.id;
//        //validation
//        //valid courseID
//        if(!course_id){
//         return res.json({
//             succesS:false,
//             message:"Please provide valid courseId",
//         });
//        };

//        //valid courseEmail

//        let course;
//        try{
//           course = await Course.findById(course_id);
//           if(!course) {
//             return res.json({
//                 success:false,
//                 message:"Could not find the course",
//             });
//           }
//          //user already pay for the same course
//          const uid = new mongoose.Types.ObjectId(userId);
//          if(course.studentsEnrolled.includes(uid)) {
//            return res.status(200).json({
//             success:false,
//             message:"Student is already enrolled",
//            });
         
//         }

//        } catch(error){
//           console.error(error);
//           return res.status(500).json({
//             success:false,
//             message:error.message,
//           })
//        }
       
//        //order create
//        const amount = course.prependOnceListener;
//        const currency = "INR";
//        const options = {
//         amount: amount*100,
//         currency,
//         reciept:Math.random(Date.now().toString),
//         notes:{
//           courseId: course_id,
//           userId,
//         }   
    
//     };
//       try{
//         //initiate the payment using razorpay
//         const paymentResponse = await instance.orders.create(options);
//         console.log(paymentResponse);

//         //return response
//         return res.status(200).json({
//               success:true,
//               courseName:course.courseName,
//               courseDescription:course.courseDescription,
//               thumbnail:course.thumbnail,
//               orderId: paymentResponse.id,
//               currency:paymentResponse.currency,
//               amount:paymentResponse.amount,
//         });
//       }  catch(error) {
//         console.log(error);
//         res.status({
//             success:false,
//             message:error.message,
//         });
//       }  

       

   
// };

//verify signature of Razorpay and Server
// exports.verifySignature = async (req, res) => {
//     const webhookSecret = "12345678";

//     const signature = req.headers("x-razorpay-signature");
 
//     const shasum = crypto.createHmac("sha256", webhookSecret);
//     shasum.update(JSON.stringify(req.body));
//     const digest = shasum.digest("hex");

//     if(signature === digest) {
//         console.log("Payment is Authorized");
        
//         const {courseId, userId} = req.body.payload.payment.entity.notes;

//         try{
//            //fulfil the action

//            //find the course and enroll the student in it
//            const enrolledCourse = await Course.findOneAndUpdate(
//                                                             {_id: courseId},
//                                                           {$push:{studentEnrolled: userId}},
//                                                           {new:true},
//            );
           
//            if(!enrolledCourse) {
//             return res.status(500).json({
//                 success:false,
//                 message:"Course Not Found",
//             });
//            }
//         console.log(enrolledCourse);

//         //find the student and add course to the list of enrolled course
//          const enrolledStudent = await User.findOneAndUpdate(
//                                                          {_id: userId},
//                                                          {$push:{course:courseId}},
//                                                          {new:true},
//          );
//          console.log(enrolledStudent);
//          //mail send kro confirmation wala
//          const emailResponse = await mailSender(
//                                     enrolledStudent.email,
//                                     "Congratulation from codehelp",
//                                     "Congratulations you are onboarded into new codehelp course",

//          );
//          console.log(emailResponse);

//          return res.status(200).json({
//             success:true,
//             message:"Signature Verified and course added",
//          });
//         } catch(error) {
//            console.log(error);
//            return res.status(500).json({
//             succesS:false,
//             message:error.message,
//            });
//         }
       
//     }
//     else {
//         return res.status(400).json({
//             success:false,
//             message:"Invalid request",
//         })
//     }
// };