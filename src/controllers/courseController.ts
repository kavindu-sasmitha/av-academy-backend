import { Response } from "express";
import Course from "../models/Course";
import Video from "../models/Video";
import Enrollment from "../models/Enrollment";
import { AuthRequest } from "../middleware/auth";

// GET /api/courses  -> list of all published courses (catalog view, no video content)
export const listCourses = async (req: AuthRequest, res: Response) => {
  const courses = await Course.find({ isPublished: true }).sort({ createdAt: -1 });

  // mark which ones the logged in user already has access to
  const enrollments = await Enrollment.find({ user: req.user!._id }).select("course");
  const accessSet = new Set(enrollments.map((e) => e.course.toString()));

  const result = courses.map((c) => ({
    id: c._id,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    category: c.category,
    price: c.price,
    instructorName: c.instructorName,
    instructorTitle: c.instructorTitle,
    instructorAvatar: c.instructorAvatar,
    previewVideoUrl: c.previewVideoUrl,
    hasAccess: accessSet.has(c._id.toString()) || req.user!.role === "admin",
  }));

  res.json({ courses: result });
};

// GET /api/courses/:id -> course detail + playlist
// Anyone logged in can open the course page. Videos that are marked `isFree`
// are always playable; the rest are only playable once the user has been
// granted access (enrolled) or is an admin — otherwise they come back locked.
export const getCourseDetail = async (req: AuthRequest, res: Response) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });

  const isAdmin = req.user!.role === "admin";
  const enrolled = isAdmin
    ? true
    : !!(await Enrollment.findOne({ user: req.user!._id, course: course._id }));

  const videos = await Video.find({ course: course._id }).sort({ day: 1, order: 1 });

  res.json({
    course: {
      id: course._id,
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      price: course.price,
      instructorName: course.instructorName,
      instructorTitle: course.instructorTitle,
      instructorBio: course.instructorBio,
      instructorAvatar: course.instructorAvatar,
      previewVideoUrl: course.previewVideoUrl,
      // only worth showing once we know the user actually needs to pay for access
      paymentDetails: enrolled ? undefined : course.paymentDetails,
      whatsappNumber: enrolled ? undefined : course.whatsappNumber,
      hasAccess: enrolled,
    },
    playlist: videos.map((v) => {
      const unlocked = enrolled || v.isFree;
      return {
        id: v._id,
        title: v.title,
        description: v.description,
        // never send the playable url (or its captions) for a locked video
        url: unlocked ? v.url : undefined,
        captionsUrl: unlocked ? v.captionsUrl : undefined,
        order: v.order,
        day: v.day,
        durationMinutes: v.durationMinutes,
        isFree: v.isFree,
        locked: !unlocked,
      };
    }),
  });
};

// GET /api/courses/my-access -> courses the current user can access
export const myCourses = async (req: AuthRequest, res: Response) => {
  const enrollments = await Enrollment.find({ user: req.user!._id }).populate("course");
  const courses = enrollments
    .filter((e) => e.course)
    .map((e: any) => ({
      id: e.course._id,
      title: e.course.title,
      description: e.course.description,
      thumbnail: e.course.thumbnail,
      category: e.course.category,
      instructorName: e.course.instructorName,
      instructorAvatar: e.course.instructorAvatar,
    }));
  res.json({ courses });
};