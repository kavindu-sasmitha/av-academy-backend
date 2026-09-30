import { Router } from "express";
import {
  listAdminCourses,
  createCourse,
  getAdminCourse,
  updateCourse,
  deleteCourse,
  getAdminCourseVideos,
  addVideo,
  updateVideo,
  deleteVideo,
  grantAccess,
  revokeAccess,
  courseStudents,
  listAllStudents,
  getAdminCourseQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizSubmissions,
  getAdminCourseAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  gradeAssignmentSubmission,
  getAdminReviews,
  deleteReview,
  toggleFeatureReview,
} from "../controllers/adminController";
import { protect } from "../middleware/auth";
import { adminOnly } from "../middleware/admin";

const router = Router();

router.use(protect, adminOnly); // every admin route requires login + admin role

// Courses
router.get("/courses", listAdminCourses);
router.post("/courses", createCourse);
router.get("/courses/:id", getAdminCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

// Videos
router.get("/courses/:id/videos", getAdminCourseVideos);
router.post("/courses/:id/videos", addVideo);
router.put("/videos/:videoId", updateVideo);
router.delete("/videos/:videoId", deleteVideo);

// Students & Access
router.get("/students", listAllStudents);
router.get("/courses/:id/students", courseStudents);
router.post("/access", grantAccess);
router.delete("/access", revokeAccess);

// Quizzes
router.get("/courses/:id/quizzes", getAdminCourseQuizzes);
router.post("/courses/:id/quizzes", createQuiz);
router.put("/quizzes/:quizId", updateQuiz);
router.delete("/quizzes/:quizId", deleteQuiz);
router.get("/quizzes/:quizId/submissions", getQuizSubmissions);

// Assignments
router.get("/courses/:id/assignments", getAdminCourseAssignments);
router.post("/courses/:id/assignments", createAssignment);
router.put("/assignments/:assignmentId", updateAssignment);
router.delete("/assignments/:assignmentId", deleteAssignment);
router.get("/assignments/:assignmentId/submissions", getAssignmentSubmissions);
router.put("/assignment-submissions/:submissionId/grade", gradeAssignmentSubmission);

// Reviews
router.get("/reviews", getAdminReviews);
router.delete("/reviews/:reviewId", deleteReview);
router.put("/reviews/:reviewId/feature", toggleFeatureReview);

export default router;
