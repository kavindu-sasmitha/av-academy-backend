import { Response } from "express";
import Course, { ICourse } from "../models/Course";
import Video, { IVideo } from "../models/Video";
import User from "../models/User";
import Enrollment from "../models/Enrollment";
import Quiz, { IQuiz } from "../models/Quiz";
import QuizSubmission from "../models/QuizSubmission";
import Assignment, { IAssignment } from "../models/Assignment";
import AssignmentSubmission from "../models/AssignmentSubmission";
import Review from "../models/Review";
import { AuthRequest } from "../middleware/auth";
import { resolveThumbnail } from "../utils/youtube";

// shape mongoose docs into the `id` (not `_id`) form the frontend expects everywhere else
const courseJSON = (c: ICourse) => ({
  id: c._id,
  title: c.title,
  description: c.description,
  thumbnail: resolveThumbnail(c.thumbnail, c.previewVideoUrl) || c.thumbnail,
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
  const resolvedThumbnail = resolveThumbnail(thumbnail, previewVideoUrl) || thumbnail;

  const course = await Course.create({
    title,
    description,
    thumbnail: resolvedThumbnail,
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
  const resolvedThumbnail = resolveThumbnail(thumbnail, previewVideoUrl) || thumbnail;

  const course = await Course.findByIdAndUpdate(
    req.params.id,
    {
      title,
      description,
      thumbnail: resolvedThumbnail,
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
  await Quiz.deleteMany({ course: req.params.id });
  await QuizSubmission.deleteMany({ course: req.params.id });
  await Assignment.deleteMany({ course: req.params.id });
  await AssignmentSubmission.deleteMany({ course: req.params.id });
  await Review.deleteMany({ course: req.params.id });
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
  const enrollments = await Enrollment.find({ course: req.params.id }).populate("user", "name email avatar");
  const students = enrollments.map((e: any) => ({
    name: e.user?.name || "Unknown",
    email: e.user?.email || "Unknown",
    avatar: e.user?.avatar,
  }));
  res.json({ students });
};

/* ─── Student Management Panel ────────────────────────────────────────────── */

// GET /api/admin/students -> List all students with enrolled courses, quiz stats, and assignment marks
export const listAllStudents = async (_req: AuthRequest, res: Response) => {
  const students = await User.find({ role: "student" }).sort({ createdAt: -1 });
  const studentIds = students.map((s) => s._id);

  const [allEnrollments, allQuizSubmissions, allAssignmentSubmissions] = await Promise.all([
    Enrollment.find({ user: { $in: studentIds } }).populate("course", "title thumbnail"),
    QuizSubmission.find({ student: { $in: studentIds } })
      .populate("quiz", "title")
      .populate("course", "title")
      .sort({ completedAt: -1 }),
    AssignmentSubmission.find({ student: { $in: studentIds } })
      .populate("assignment", "title maxMarks")
      .populate("course", "title")
      .sort({ submittedAt: -1 }),
  ]);

  const result = students.map((s) => {
    const sId = s._id.toString();
    const enrolled = allEnrollments.filter((e) => e.user.toString() === sId);
    const quizzes = allQuizSubmissions.filter((q) => q.student.toString() === sId);
    const assignments = allAssignmentSubmissions.filter((a) => a.student.toString() === sId);

    const totalQuizScore = quizzes.reduce((acc, q) => acc + (q.score || 0), 0);
    const totalQuizMax = quizzes.reduce((acc, q) => acc + (q.maxScore || 0), 0);
    const avgQuizPercentage = totalQuizMax > 0 ? Math.round((totalQuizScore / totalQuizMax) * 100) : null;

    return {
      id: s._id,
      name: s.name,
      email: s.email,
      avatar: s.avatar,
      createdAt: s.createdAt,
      enrolledCourses: enrolled.map((e: any) => ({
        id: e.course?._id,
        title: e.course?.title || "Unknown Course",
        thumbnail: e.course ? (resolveThumbnail(e.course.thumbnail, (e.course as any).previewVideoUrl) || e.course.thumbnail) : undefined,
        enrolledAt: e.createdAt,
      })),
      quizSubmissions: quizzes.map((q: any) => ({
        id: q._id,
        quizId: q.quiz?._id,
        quizTitle: q.quiz?.title || "Quiz",
        courseTitle: q.course?.title || "Course",
        score: q.score,
        maxScore: q.maxScore,
        percentage: q.percentage,
        passed: q.passed,
        completedAt: q.completedAt,
      })),
      assignmentSubmissions: assignments.map((a: any) => ({
        id: a._id,
        assignmentId: a.assignment?._id,
        assignmentTitle: a.assignment?.title || "Assignment",
        courseTitle: a.course?.title || "Course",
        marks: a.marks,
        maxMarks: a.maxMarks || a.assignment?.maxMarks || 100,
        feedback: a.feedback,
        status: a.status,
        submittedAt: a.submittedAt,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        notes: a.notes,
      })),
      stats: {
        enrolledCount: enrolled.length,
        quizzesTaken: quizzes.length,
        avgQuizPercentage,
        assignmentsSubmitted: assignments.length,
      },
    };
  });

  res.json({ students: result });
};

/* ─── Quizzes CRUD (Admin) ─────────────────────────────────────────────────── */

const quizJSON = (q: IQuiz) => ({
  id: q._id,
  courseId: q.course,
  title: q.title,
  description: q.description,
  afterVideoId: q.afterVideoId,
  order: q.order,
  day: q.day,
  passingScore: q.passingScore,
  questions: q.questions,
  questionCount: q.questions?.length || 0,
});

export const getAdminCourseQuizzes = async (req: AuthRequest, res: Response) => {
  const quizzes = await Quiz.find({ course: req.params.id }).sort({ day: 1, order: 1, createdAt: 1 });
  res.json({ quizzes: quizzes.map(quizJSON) });
};

export const createQuiz = async (req: AuthRequest, res: Response) => {
  const { title, description, afterVideoId, order, day, passingScore, questions } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Quiz title is required" });
  }
  const quiz = await Quiz.create({
    course: req.params.id,
    title,
    description,
    afterVideoId: afterVideoId || undefined,
    order: order ?? 0,
    day: day || undefined,
    passingScore: passingScore ?? 50,
    questions: Array.isArray(questions) ? questions : [],
  });
  res.status(201).json({ quiz: quizJSON(quiz) });
};

export const updateQuiz = async (req: AuthRequest, res: Response) => {
  const { title, description, afterVideoId, order, day, passingScore, questions } = req.body;
  const quiz = await Quiz.findByIdAndUpdate(
    req.params.quizId,
    {
      title,
      description,
      afterVideoId: afterVideoId || null,
      order: order ?? 0,
      day: day || null,
      passingScore: passingScore ?? 50,
      questions: Array.isArray(questions) ? questions : [],
    },
    { new: true, runValidators: true }
  );
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });
  res.json({ quiz: quizJSON(quiz) });
};

export const deleteQuiz = async (req: AuthRequest, res: Response) => {
  await Quiz.findByIdAndDelete(req.params.quizId);
  await QuizSubmission.deleteMany({ quiz: req.params.quizId });
  res.json({ message: "Quiz deleted" });
};

export const getQuizSubmissions = async (req: AuthRequest, res: Response) => {
  const submissions = await QuizSubmission.find({ quiz: req.params.quizId })
    .populate("student", "name email avatar")
    .sort({ completedAt: -1 });
  res.json({ submissions });
};

/* ─── Assignments CRUD & Grading (Admin) ───────────────────────────────────── */

const assignmentJSON = (a: IAssignment) => ({
  id: a._id,
  courseId: a.course,
  title: a.title,
  description: a.description,
  pdfUrl: a.pdfUrl,
  pdfName: a.pdfName,
  dueDate: a.dueDate,
  maxMarks: a.maxMarks,
  afterVideoId: a.afterVideoId,
  order: a.order,
});

export const getAdminCourseAssignments = async (req: AuthRequest, res: Response) => {
  const assignments = await Assignment.find({ course: req.params.id }).sort({ order: 1, createdAt: 1 });
  res.json({ assignments: assignments.map(assignmentJSON) });
};

export const createAssignment = async (req: AuthRequest, res: Response) => {
  const { title, description, pdfUrl, pdfName, dueDate, maxMarks, afterVideoId, order } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: "Title and description are required" });
  }
  const assignment = await Assignment.create({
    course: req.params.id,
    title,
    description,
    pdfUrl,
    pdfName,
    dueDate: dueDate || undefined,
    maxMarks: maxMarks ?? 100,
    afterVideoId: afterVideoId || undefined,
    order: order ?? 0,
  });
  res.status(201).json({ assignment: assignmentJSON(assignment) });
};

export const updateAssignment = async (req: AuthRequest, res: Response) => {
  const { title, description, pdfUrl, pdfName, dueDate, maxMarks, afterVideoId, order } = req.body;
  const assignment = await Assignment.findByIdAndUpdate(
    req.params.assignmentId,
    {
      title,
      description,
      pdfUrl,
      pdfName,
      dueDate: dueDate || null,
      maxMarks: maxMarks ?? 100,
      afterVideoId: afterVideoId || null,
      order: order ?? 0,
    },
    { new: true, runValidators: true }
  );
  if (!assignment) return res.status(404).json({ message: "Assignment not found" });
  res.json({ assignment: assignmentJSON(assignment) });
};

export const deleteAssignment = async (req: AuthRequest, res: Response) => {
  await Assignment.findByIdAndDelete(req.params.assignmentId);
  await AssignmentSubmission.deleteMany({ assignment: req.params.assignmentId });
  res.json({ message: "Assignment deleted" });
};

export const getAssignmentSubmissions = async (req: AuthRequest, res: Response) => {
  const submissions = await AssignmentSubmission.find({ assignment: req.params.assignmentId })
    .populate("student", "name email avatar")
    .sort({ submittedAt: -1 });
  res.json({ submissions });
};

export const gradeAssignmentSubmission = async (req: AuthRequest, res: Response) => {
  const { marks, feedback } = req.body;
  const submission = await AssignmentSubmission.findByIdAndUpdate(
    req.params.submissionId,
    {
      marks: Number(marks),
      feedback,
      status: "graded",
      gradedAt: new Date(),
      gradedBy: req.user!._id,
    },
    { new: true }
  ).populate("student", "name email avatar");
  if (!submission) return res.status(404).json({ message: "Submission not found" });
  res.json({ submission });
};

/* ─── Reviews Moderation (Admin) ───────────────────────────────────────────── */

export const getAdminReviews = async (_req: AuthRequest, res: Response) => {
  const reviews = await Review.find()
    .populate("user", "name email avatar")
    .populate("course", "title")
    .sort({ createdAt: -1 });
  res.json({ reviews });
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  await Review.findByIdAndDelete(req.params.reviewId);
  res.json({ message: "Review deleted" });
};

export const toggleFeatureReview = async (req: AuthRequest, res: Response) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) return res.status(404).json({ message: "Review not found" });
  review.isFeatured = !review.isFeatured;
  await review.save();
  res.json({ review });
};