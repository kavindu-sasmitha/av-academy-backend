import { Router } from "express";
import { academyInfo, publicCourses, publicInstructors, publicReviews } from "../controllers/publicController";

const router = Router();

// intentionally no `protect` middleware — this router powers the public home page
router.get("/academy", academyInfo);
router.get("/courses", publicCourses);
router.get("/instructors", publicInstructors);
router.get("/reviews", publicReviews);

export default router;
