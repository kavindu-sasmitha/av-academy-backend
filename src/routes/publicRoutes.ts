import { Router } from "express";
import { academyInfo, publicCourses, publicInstructors } from "../controllers/publicController";

const router = Router();

// intentionally no `protect` middleware — this router powers the public home page
router.get("/academy", academyInfo);
router.get("/courses", publicCourses);
router.get("/instructors", publicInstructors);

export default router;
