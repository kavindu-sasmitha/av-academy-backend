import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQuizAnswerResult {
  questionIndex: number;
  selectedAnswerIndex: number;
  correctAnswerIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface IQuizSubmission extends Document {
  _id: Types.ObjectId;
  quiz: Types.ObjectId;
  course: Types.ObjectId;
  student: Types.ObjectId;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: IQuizAnswerResult[];
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const quizAnswerResultSchema = new Schema<IQuizAnswerResult>(
  {
    questionIndex: { type: Number, required: true },
    selectedAnswerIndex: { type: Number, required: true },
    correctAnswerIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    pointsEarned: { type: Number, default: 0 },
  },
  { _id: false }
);

const quizSubmissionSchema = new Schema<IQuizSubmission>(
  {
    quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    answers: { type: [quizAnswerResultSchema], default: [] },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

quizSubmissionSchema.index({ student: 1, quiz: 1 });
quizSubmissionSchema.index({ course: 1, student: 1 });

export default mongoose.model<IQuizSubmission>("QuizSubmission", quizSubmissionSchema);
