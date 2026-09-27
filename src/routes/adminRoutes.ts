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
} from "../controllers/adminController";
import { protect } from "../middleware/auth";
import { adminOnly } from "../middleware/admin";

const router = Router();

router.use(protect, adminOnly); // every admin route requires login + admin role

router.get("/courses", listAdminCourses);
router.post("/courses", createCourse);
router.get("/courses/:id", getAdminCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

router.get("/courses/:id/videos", getAdminCourseVideos);
router.post("/courses/:id/videos", addVideo);
router.put("/videos/:videoId", updateVideo);
router.delete("/videos/:videoId", deleteVideo);

router.get("/courses/:id/students", courseStudents);

router.post("/access", grantAccess);
router.delete("/access", revokeAccess);

export default router;
