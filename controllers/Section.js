const Section = require("../models/Section");
const Course = require("../models/Course");

exports.createSection = async (req, res) => {
    try{
        //data fetch
        const {sectionName, courseId} = req.body;

        //data validation
        if(!sectionName || !courseId) {
            return res.status(400).json({
              succcess:false,
              message:"Missing Properties",  
            });
        }
        //create section
        const newSection = await Section.create({sectionName});
        //update course with section ObjectID
        const updatedCourseDetails = await Course.findByIdAndUpdate(
                                                          courseId,
                                                          {
                                                            $push:{
                                                                courseContent:newSection._id,
                                                            }
                                                          },
                                                          {new:true},
        );
        //return response
        return res.status(200).json({
            success:true,
            message:"Section Created Successfully",
            updatedCourseDetails,
        });

    } catch(error) {
        return res.status(500).json({
            success:false, 
            message:"Unable to create Section, please try again",
            error:error.message,
        })

    }
}

//update section
exports.updateSection = a