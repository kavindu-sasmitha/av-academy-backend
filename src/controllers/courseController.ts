import { Response } from "express";
import Course from "../models/Course";
import Video from "../models/Video";
import Enrollment from "../models/Enrollment";
import Quiz, { IQuiz } from "../models/Quiz";
import QuizSubmission from "../models/QuizSubmission";
import Assignment, { IAssignment } from "../models/Assignment";
import AssignmentSubmission from "../models/AssignmentSubmission";
import Review from "../models/Review";
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

// GET /api/courses/:id -> course detail + playlist + quizzes + assignments + reviews
export const getCourseDetail = async (req: AuthRequest, res: Response) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });

  const isAdmin = req.user!.role === "admin";
  const enrolled = isAdmin
    ? true
    : !!(await Enrollment.findOne({ user: req.user!._id, course: course._id }));

  const [videos, quizzes, assignments, reviews, myQuizSubmissions, myAssignmentSubmissions] =
    await Promise.all([
      Video.find({ course: course._id }).sort({ day: 1, order: 1 }),
      Quiz.find({ course: course._id }).sort({ day: 1, order: 1 }),
      Assignment.find({ course: course._id }).sort({ order: 1 }),
      Review.find({ course: course._id }).populate("user", "name avatar").sort({ createdAt: -1 }),
      QuizSubmission.find({ course: course._id, student: req.user!._id }).sort({ completedAt: -1 }),
      AssignmentSubmission.find({ course: course._id, student: req.user!._id }),
    ]);

  const quizSubMap = new Map();
  for (const sub of myQuizSubmissions) {
    if (!quizSubMap.has(sub.quiz.toString())) {
      quizSubMap.set(sub.quiz.toString(), sub);
    }
  }

  const assignSubMap = new Map();
  for (const sub of myAssignmentSubmissions) {
    assignSubMap.set(sub.assignment.toString(), sub);
  }

  // Calculate review stats
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
      : 5.0;

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
      paymentDetails: enrolled ? undefined : course.paymentDetails,
      whatsappNumber: enrolled ? undefined : course.whatsappNumber,
      hasAccess: enrolled,
      averageRating: avgRating,
      reviewCount: totalReviews,
    },
    playlist: videos.map((v) => {
      const unlocked = enrolled || v.isFree;
      return {
        id: v._id,
        title: v.title,
        description: v.description,
        url: unlocked ? v.url : undefined,
        captionsUrl: unlocked ? v.captionsUrl : undefined,
        order: v.order,
        day: v.day,
        durationMinutes: v.durationMinutes,
        isFree: v.isFree,
        locked: !unlocked,
      };
    }),
    quizzes: quizzes.map((q) => {
      const sub = quizSubMap.get(q._id.toString());
      return {
        id: q._id,
        title: q.title,
        description: q.description,
        afterVideoId: q.afterVideoId,
        order: q.order,
        day: q.day,
        passingScore: q.passingScore,
        questionCount: q.questions.length,
        // Only strip answers if user is not admin
        questions: q.questions.map((qn) => ({
          question: qn.question,
          options: qn.options,
          points: qn.points || 1,
          // hide correctAnswerIndex & explanation for students until they complete
          correctAnswerIndex: isAdmin || sub ? qn.correctAnswerIndex : undefined,
          explanation: isAdmin || sub ? qn.explanation : undefined,
        })),
        lastSubmission: sub
          ? {
              score: sub.score,
              maxScore: sub.maxScore,
              percentage: sub.percentage,
              passed: sub.passed,
              completedAt: sub.completedAt,
              answers: sub.answers,
            }
          : null,
      };
    }),
    assignments: assignments.map((a) => {
      const sub = assignSubMap.get(a._id.toString());
      return {
        id: a._id,
        title: a.title,
        description: a.description,
        pdfUrl: a.pdfUrl,
        pdfName: a.pdfName,
        dueDate: a.dueDate,
        maxMarks: a.maxMarks,
        afterVideoId: a.afterVideoId,
        order: a.order,
        submission: sub
          ? {
              id: sub._id,
              fileUrl: sub.fileUrl,
              fileName: sub.fileName,
              notes: sub.notes,
              marks: sub.marks,
              maxMarks: sub.maxMarks,
              feedback: sub.feedback,
              status: sub.status,
              submittedAt: sub.submittedAt,
            }
          : null,
      };
    }),
    reviews: reviews.map((r: any) => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      user: {
        id: r.user?._id,
        name: r.user?.name || "Student",
        avatar: r.user?.avatar,
      },
    })),
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

/* ─── Quizzes Student Endpoints ────────────────────────────────────────────── */

// GET /api/courses/:id/quizzes
export const getCourseQuizzes = async (req: AuthRequest, res: Response) => {
  const quizzes = await Quiz.find({ course: req.params.id }).sort({ day: 1, order: 1 });
  const submissions = await QuizSubmission.find({
    course: req.params.id,
    student: req.user!._id,
  }).sort({ completedAt: -1 });

  const subMap = new Map();
  for (const s of submissions) {
    if (!subMap.has(s.quiz.toString())) {
      subMap.set(s.quiz.toString(), s);
    }
  }

  const result = quizzes.map((q) => {
    const sub = subMap.get(q._id.toString());
    return {
      id: q._id,
      title: q.title,
      description: q.description,
      afterVideoId: q.afterVideoId,
      order: q.order,
      day: q.day,
      passingScore: q.passingScore,
      questions: q.questions.map((qn) => ({
        question: qn.question,
        options: qn.options,
        points: qn.points || 1,
        // only show answer if already completed
        correctAnswerIndex: sub ? qn.correctAnswerIndex : undefined,
        explanation: sub ? qn.explanation : undefined,
      })),
      lastSubmission: sub
        ? {
            score: sub.score,
            maxScore: sub.maxScore,
            percentage: sub.percentage,
            passed: sub.passed,
            completedAt: sub.completedAt,
            answers: sub.answers,
          }
        : null,
    };
  });

  res.json({ quizzes: result });
};

// POST /api/courses/:courseId/quizzes/:quizId/submit
// Real-time grading and result calculation
export const submitQuiz = async (req: AuthRequest, res: Response) => {
  const { answers } = req.body; // array of { questionIndex, selectedAnswerIndex }
  const { courseId, quizId } = req.params;

  if (!Array.isArray(answers)) {
    return res.status(400).json({ message: "Answers array is required" });
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz || quiz.course.toString() !== courseId) {
    return res.status(404).json({ message: "Quiz not found for this course" });
  }

  const answerMap = new Map<number, number>();
  answers.forEach((a: any) => {
    answerMap.set(Number(a.questionIndex), Number(a.selectedAnswerIndex));
  });

  let totalScore = 0;
  let maxScore = 0;
  const detailedResults: any[] = [];

  quiz.questions.forEach((q, idx) => {
    const points = q.points || 1;
    maxScore += points;

    const selectedIndex = answerMap.has(idx) ? answerMap.get(idx)! : -1;
    const isCorrect = selectedIndex === q.correctAnswerIndex;
    const pointsEarned = isCorrect ? points : 0;
    totalScore += pointsEarned;

    detailedResults.push({
      questionIndex: idx,
      question: q.question,
      options: q.options,
      selectedAnswerIndex: selectedIndex,
      correctAnswerIndex: q.correctAnswerIndex,
      isCorrect,
      pointsEarned,
      explanation: q.explanation,
    });
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= (quiz.passingScore || 50);

  const submission = await QuizSubmission.create({
    quiz: quiz._id,
    course: quiz.course,
    student: req.user!._id,
    score: totalScore,
    maxScore,
    percentage,
    passed,
    answers: detailedResults.map((r) => ({
      questionIndex: r.questionIndex,
      selectedAnswerIndex: r.selectedAnswerIndex,
      correctAnswerIndex: r.correctAnswerIndex,
      isCorrect: r.isCorrect,
      pointsEarned: r.pointsEarned,
    })),
    completedAt: new Date(),
  });

  res.status(201).json({
    message: passed ? "Congratulations, you passed the quiz!" : "Quiz completed. Keep practicing!",
    submission: {
      id: submission._id,
      score: totalScore,
      maxScore,
      percentage,
      passed,
      completedAt: submission.completedAt,
    },
    results: detailedResults,
  });
};

/* ─── Assignments Student Endpoints ────────────────────────────────────────── */

// GET /api/courses/:id/assignments
export const getCourseAssignments = async (req: AuthRequest, res: Response) => {
  const assignments = await Assignment.find({ course: req.params.id }).sort({ order: 1 });
  const submissions = await AssignmentSubmission.find({
    course: req.params.id,
    student: req.user!._id,
  });

  const subMap = new Map();
  submissions.forEach((s) => subMap.set(s.assignment.toString(), s));

  const result = assignments.map((a) => {
    const sub = subMap.get(a._id.toString());
    return {
      id: a._id,
      title: a.title,
      description: a.description,
      pdfUrl: a.pdfUrl,
      pdfName: a.pdfName,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      afterVideoId: a.afterVideoId,
      order: a.order,
      submission: sub
        ? {
            id: sub._id,
            fileUrl: sub.fileUrl,
            fileName: sub.fileName,
            notes: sub.notes,
            marks: sub.marks,
            maxMarks: sub.maxMarks,
            feedback: sub.feedback,
            status: sub.status,
            submittedAt: sub.submittedAt,
          }
        : null,
    };
  });

  res.json({ assignments: result });
};

// POST /api/courses/:courseId/assignments/:assignmentId/submit
export const submitAssignment = async (req: AuthRequest, res: Response) => {
  const { fileUrl, fileName, notes } = req.body;
  const { courseId, assignmentId } = req.params;

  if (!fileUrl && !notes) {
    return res.status(400).json({ message: "Please provide a file or notes for submission" });
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment || assignment.course.toString() !== courseId) {
    return res.status(404).json({ message: "Assignment not found for this course" });
  }

  let submission = await AssignmentSubmission.findOne({
    assignment: assignment._id,
    student: req.user!._id,
  });

  if (submission) {
    submission.fileUrl = fileUrl || submission.fileUrl;
    submission.fileName = fileName || submission.fileName;
    submission.notes = notes !== undefined ? notes : submission.notes;
    submission.submittedAt = new Date();
    submission.status = "submitted";
    await submission.save();
  } else {
    submission = await AssignmentSubmission.create({
      assignment: assignment._id,
      course: assignment.course,
      student: req.user!._id,
      fileUrl,
      fileName,
      notes,
      maxMarks: assignment.maxMarks,
      status: "submitted",
      submittedAt: new Date(),
    });
  }

  res.status(200).json({
    message: "Assignment submitted successfully!",
    submission,
  });
};

/* ─── Reviews & Comments Endpoints ─────────────────────────────────────────── */

// GET /api/courses/:id/reviews
export const getCourseReviews = async (req: AuthRequest, res: Response) => {
  const reviews = await Review.find({ course: req.params.id })
    .populate("user", "name avatar")
    .sort({ createdAt: -1 });

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
      : 5.0;

  res.json({
    reviews: reviews.map((r: any) => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      user: {
        id: r.user?._id,
        name: r.user?.name || "Student",
        avatar: r.user?.avatar,
      },
    })),
    averageRating,
    totalReviews,
  });
};

// POST /api/courses/:id/reviews
export const submitReview = async (req: AuthRequest, res: Response) => {
  const { rating, comment } = req.body;
  if (!rating || !comment) {
    return res.status(400).json({ message: "Rating and comment are required" });
  }

  const numRating = Number(rating);
  if (numRating < 1 || numRating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });

  const review = await Review.findOneAndUpdate(
    { course: course._id, user: req.user!._id },
    { rating: numRating, comment: comment.trim() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("user", "name avatar");

  res.status(201).json({
    message: "Review submitted successfully!",
    review: {
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      user: {
        id: (review.user as any)?._id,
        name: (review.user as any)?.name || "Student",
        avatar: (review.user as any)?.avatar,
      },
    },
  });
};