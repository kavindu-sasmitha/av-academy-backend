import { Response } from "express";
import Course, { ICourse } from "../models/Course";
import Video, { IVideo } from "../models/Video";
import User from "../models/User";
import Enrollment from "../models/Enrollment";
import { AuthRequest } from "../middleware/auth";

// shape mongoose docs into the `id` (not `_id`) form the frontend expects everywhere else
const courseJSON = (c: ICourse) => ({
  id: c._id,
  title: c.title,
  description: c.description,
  thumbnail: c.thumbnail,
  category: c.category,
  price: c.price,
  instructorName: c.instructorName,
  instructorTitle: c.instructorTitle,
  instructorBio: c.instructorBio,
  instructorAvatar: c.instructorAvatar,
  previewVideoUrl: c.previewVideoUrl,
  paymentDetails: c.paymentDetails,
  whatsappNumber: c.whatsappNumber,
  isPublished: c.isPublished,
});

const videoJSON = (v: IVideo) => ({
  id: v._id,
  title: v.title,
  description: v.description,
  url: v.url,
  order: v.order,
  durationMinutes: v.durationMinutes,
  isFree: v.isFree,
  day: v.day,
  captionsUrl: v.captionsUrl,
});

// POST /api/admin/courses -> create a new course
export const createCourse = async (req: AuthRequest, res: Response) => {
  const {
    title,
    description,
    thumbnail,
    category,
    price,
    instructorName,
    instructorTitle,
    instructorBio,
    instructorAvatar,
    previewVideoUrl,
    paymentDetails,
    whatsappNumber,
  } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required" });
  }
  const course = await Course.create({
    title,
    description,
    thumbnail,
    category,
    price,
    instructorName,
    instructorTitle,
    instructorBio,
    instructorAvatar,
    previewVideoUrl,
    paymentDetails,
    whatsappNumber,
    createdBy: req.user!._id,
  });
  res.status(201).json({ course: courseJSON(course) });
};

// GET /api/admin/courses -> every course (including unpublished), for the admin table
export const listAdminCourses = async (_req: AuthRequest, res: Response) => {
  const courses = await Course.find().sort({ createdAt: -1 });
  res.json({ courses: courses.map(courseJSON) });
};

// GET /api/admin/courses/:id -> full course record, for the edit form
export const getAdminCourse = async (req: AuthRequest, res: Response) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ course: courseJSON(course) });
};

// PUT /api/admin/courses/:id
export const updateCourse = async (req: AuthRequest, res: Response) => {
  const {
    title,
    description,
    thumbnail,
    category,
    price,
    instructorName,
    instructorTitle,
    instructorBio,
    instructorAvatar,
    previewVideoUrl,
    paymentDetails,
    whatsappNumber,
    isPublished,
  } = req.body;
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    {
      title,
      description,
      thumbnail,
      category,
      price,
      instructorName,
      instructorTitle,
      instructorBio,
      instructorAvatar,
      previewVideoUrl,
      paymentDetails,
      whatsappNumber,
      isPublished,
    },
    { new: true, runValidators: true }
  );
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ course: courseJSON(course) });
};

// DELETE /api/admin/courses/:id
export const deleteCourse = async (req: AuthRequest, res: Response) => {
  await Course.findByIdAndDelete(req.params.id);
  await Video.deleteMany({ course: req.params.id });
  await Enrollment.deleteMany({ course: req.params.id });
  res.json({ message: "Course deleted" });
};

// GET /api/admin/courses/:id/videos -> full playlist for a course, for the admin table
export const getAdminCourseVideos = async (req: AuthRequest, res: Response) => {
  const videos = await Video.find({ course: req.params.id }).sort({ day: 1, order: 1 });
  res.json({ videos: videos.map(videoJSON) });
};

// POST /api/admin/courses/:id/videos -> add a video to a course's playlist
export const addVideo = async (req: AuthRequest, res: Response) => {
  const { title, description, url, order, durationMinutes, isFree, day, captionsUrl } = req.body;
  if (!title || !url) {
    return res.status(400).json({ message: "Title and url are required" });
  }
  const video = await Video.create({
    course: req.params.id,
    title,
    description,
    url,
    order: order ?? 0,
    durationMinutes,
    isFree: !!isFree,
    day: day || undefined,
    captionsUrl,
  });
  res.status(201).json({ video: videoJSON(video) });
};

// PUT /api/admin/videos/:videoId -> edit an existing video
export const updateVideo = async (req: AuthRequest, res: Response) => {
  const { title, description, url, order, durationMinutes, isFree, day, captionsUrl } = req.body;
  const video = await Video.findByIdAndUpdate(
    req.params.videoId,
    { title, description, url, order, durationMinutes, isFree: !!isFree, day: day || undefined, captionsUrl },
    { new: true, runValidators: true }
  );
  if (!video) return res.status(404).json({ message: "Video not found" });
  res.json({ video: videoJSON(video) });
};

// DELETE /api/admin/videos/:videoId
export const deleteVideo = async (req: AuthRequest, res: Response) => {
  await Video.findByIdAndDelete(req.params.videoId);
  res.json({ message: "Video deleted" });
};

// POST /api/admin/access -> grant a student access to a course by email
// body: { email, courseId }
export const grantAccess = async (req: AuthRequest, res: Response) => {
  const { email, courseId } = req.body;
  if (!email || !courseId) {
    return res.status(400).json({ message: "email and courseId are required" });
  }

  const student = await User.findOne({ email: email.toLowerCase() });
  if (!student) {
    return res.status(404).json({ message: "No user found with that email. They must sign up first." });
  }

  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });

  const existing = await Enrollment.findOne({ user: student._id, course: course._id });
  if (existing) {
    return res.status(400).json({ message: "User already has access to this course" });
  }

  const enrollment = await Enrollment.create({
    user: student._id,
    course: course._id,
    grantedBy: req.user!._id,
  });

  res.status(201).json({ enrollment });
};

// DELETE /api/admin/access -> revoke access
// body: { email, courseId }
export const revokeAccess = async (req: AuthRequest, res: Response) => {
  const { email, courseId } = req.body;
  const student = await User.findOne({ email: email.toLowerCase() });
  if (!student) return res.status(404).json({ message: "User not found" });

  await Enrollment.findOneAndDelete({ user: student._id, course: courseId });
  res.json({ message: "Access revoked" });
};

// GET /api/admin/courses/:id/students -> who has access to this course
export const courseStudents = async (req: AuthRequest, res: Response) => {
  const enrollments = await Enrollment.find({ course: req.params.id }).populate("user", "name email");
  const students = enrollments.map((e: any) => ({
    name: e.user.name,
    email: e.user.email,
  }));
  res.json({ students });
};