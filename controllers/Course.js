const Course =require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

//createCourse handler function
exports.createCourse = async (req, res) => {
    try{
      //fetch data
      const {courseName, courseDescription, whatYouWillLearn, price, tag} = req.body;

      //get thumbnails
      const thumbnail = req.files.thumbnailImage;

      //validation
      if(!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !thumbnail) {
        return res.status(400).json({
            success:false,
            message:"All fields are required",
        });
      }

      //check for instructor
      const userId =  req.user.id;
      const instructorDetails = await User.findById(userId);
      console.log("Instructor Details: ", instructorDetails);
    


      if(!instructorDetails){
        return res.status(400).json({
            success:false,
            message:"Message Details not found",
        });
      }

      //check given tag is valid or not
      const tagDetails= await Tag.findById(tag);
      if(!tagDetails) {
        return res.status(404).json({
            success:false,
            message:"Tag details not found",
        });
      }
    
      //Upload image to cloundinary
      const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

      //create an entry for new course
      const newCourse = await Course.create({
           courseName,
           courseDescription,
           instructor: instructorDetails._id,
           whatYouWillLearn:whatYouWillLearn,
           price:price,
           tag:tagDetails._id,
           thumbnail:thumbnailImage.secure_url,
      });

      //add the new course to the userSchema of the user
      await User.findByIdAndUpdate(
        {_id: instructorDetails._id},
        {
            $push: {
                courses: newCourse._id,
            }
        },
        {new:true},
      );
      //update the TAG ka schema

      //return  response
      return res.status(200).json({
        success:true,
        message:"Course Created Successfully",
        data:newCourse,
      })
    } catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Something went wrong",
        });
    }
}


//getAllCourse handler function

exports.getAllCourses = async (req, res) => {
    try{
         const allCourses = await Course.find({}, {courseName:true,
                                                   price:true,
                                                   thumbnail:true,
                                                   instructor:true,
                                                   ratingAndReviews:true,
                                                   studentsEnroolled:true,})
                                                   .populate("instructor")
                                                   .exec();
          return res.status(200).json({
            success:true,
            message:"Data for all courses fetched successfully",
            data:allCourses,
          })                                         
        
    } catch(error) {
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"Cannot fetch course data",
            error:error.message,
        });
    }
}


//get  courseDetails
exports.getCourseDetails = async (req, res) => {
  try{
      //get id
      const {courseId} = req.body;
      //find course details
      const courseDetails = await Course.find(
                                        {_id:courseId},)
                                        .populate(
                                          {
                                            path:"instructor",
                                            populate:{
                                              path:"additionalDetails",
                                            },
                                          }
                                        )
                                        .populate("category")
                                        .populate("ratingAndReviews")
                                        .populate({
                                          path:"courseContent",
                                          populate:{
                                            path:"subSection",
                                          }
                                        })
                                        .exec();

    //validaton
    if(!courseDetails) {
      return res.status(400).json({
        success:false,
        message:`Could not find the course with ${courseId}`,
          });
    }
      //return response
      return res.status(200).json({
        success:true,
        message:"Course Details fetched successfulluy",
        data:courseDetails,
      })
  } catch(error) {
       console.log(error);
       return res.status(500).json({
        success:false,
        message:error.message,
       })
  }
}