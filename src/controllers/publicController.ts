import { Request, Response } from "express";
import Course from "../models/Course";
import Review from "../models/Review";
import { resolveThumbnail } from "../utils/youtube";

// Edit these to the academy's real contact details / social links — shown in
// the site footer. Left as plain constants (not DB fields) since they change
// rarely; set any value to "" / [] to hide that row from the footer.
const CONTACT = {
  email: "hello@academy.com",
  phone: "+94 77 123 4567",
  address: "Negombo, Western Province, Sri Lanka",
  socials: [
    { label: "Facebook", url: "https://facebook.com" },
    { label: "Instagram", url: "https://instagram.com" },
    { label: "YouTube", url: "https://youtube.com" },
  ],
};

// GET /api/public/academy -> static "about this academy" info shown on the home page
export const academyInfo = async (_req: Request, res: Response) => {
  const courseCount = await Course.countDocuments({ isPublished: true });

  res.json({
    academy: {
      name: "Academy",
      tagline: "Learn from real instructors, at your own pace.",
      description:
        "Academy is an online learning platform where every course is taught by a named " +
        "instructor with real-world experience. Browse the catalog for free, then sign in " +
        "to unlock the courses you've been granted access to and track your progress from " +
        "your own dashboard.",
      highlights: [
        {
          title: "Curated courses",
          body: "Every course is reviewed before it's published, so the catalog stays focused and practical.",
        },
        {
          title: "Real instructors",
          body: "No anonymous content. Each course lists the instructor teaching it, with their background.",
        },
        {
          title: "Access you control",
          body: "Course access is granted per student, so your dashboard only ever shows what's relevant to you.",
        },
      ],
      stats: {
        courseCount,
      },
      contact: CONTACT,
    },
  });
};

// GET /api/public/courses -> published course catalog, visible without logging in
// (no `hasAccess`/lock state here — that's only meaningful once a user is authenticated)
export const publicCourses = async (_req: Request, res: Response) => {
  const courses = await Course.find({ isPublished: true }).sort({ createdAt: -1 });

  const result = courses.map((c) => ({
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
  }));

  res.json({ courses: result });
};

// GET /api/public/instructors -> unique instructor roster, derived from published courses
export const publicInstructors = async (_req: Request, res: Response) => {
  const courses = await Course.find({
    isPublished: true,
    instructorName: { $exists: true, $ne: "" },
  }).sort({ createdAt: -1 });

  const byName = new Map<
    string,
    { name: string; title?: string; bio?: string; avatar?: string; courseTitles: string[] }
  >();

  for (const c of courses) {
    const name = c.instructorName as string;
    const existing = byName.get(name);
    if (existing) {
      existing.courseTitles.push(c.title);
    } else {
      byName.set(name, {
        name,
        title: c.instructorTitle,
        bio: c.instructorBio,
        avatar: c.instructorAvatar,
        courseTitles: [c.title],
      });
    }
  }

  res.json({ instructors: Array.from(byName.values()) });
};

// GET /api/public/reviews -> recent and featured reviews for the home page showcase
export const publicReviews = async (_req: Request, res: Response) => {
  const reviews = await Review.find()
    .populate("user", "name avatar")
    .populate("course", "title thumbnail")
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(12);

  const result = reviews
    .filter((r) => r.course && r.user)
    .map((r: any) => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      studentName: r.user?.name || "Verified Student",
      studentAvatar: r.user?.avatar,
      courseTitle: r.course?.title || "Academy Course",
    }));

  res.json({ reviews: result });
};