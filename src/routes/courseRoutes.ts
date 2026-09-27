import { Router } from "express";
import { listCourses, getCourseDetail, myCourses } from "../controllers/courseController";
import { protect } from "../middleware/auth";

const router = Router();

router.use(protect); // all course routes require login

router.get("/", listCourses);
router.get("/my-access", myCourses);
router.get("/:id", getCourseDetail);

export default router;
