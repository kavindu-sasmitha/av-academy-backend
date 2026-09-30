import { Router } from "express";
import {
  listCourses,
  getCourseDetail,
  myCourses,
  getCourseQuizzes,
  submitQuiz,
  getCourseAssignments,
  submitAssignment,
  getCourseReviews,
  submitReview,
} from "../controllers/courseController";
import { protect } from "../middleware/auth";

const router = Router();

router.use(protect); // all course routes require login

router.get("/", listCourses);
router.get("/my-access", myCourses);
router.get("/:id", getCourseDetail);

// Quizzes
router.get("/:id/quizzes", getCourseQuizzes);
router.post("/:courseId/quizzes/:quizId/submit", submitQuiz);

// Assignments
router.get("/:id/assignments", getCourseAssignments);
router.post("/:courseId/assignments/:assignmentId/submit", submitAssignment);

// Reviews & Comments
router.get("/:id/reviews", getCourseReviews);
router.post("/:id/reviews", submitReview);

export default router;
