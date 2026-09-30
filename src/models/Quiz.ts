import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  points?: number;
}

export interface IQuiz extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  title: string;
  description?: string;
  afterVideoId?: Types.ObjectId; // Video after which this quiz appears
  order: number;
  day?: number;
  passingScore: number; // e.g. 50 (%)
  questions: IQuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const quizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: { type: String, required: true, trim: true },
    options: [{ type: String, required: true, trim: true }],
    correctAnswerIndex: { type: Number, required: true },
    explanation: { type: String, trim: true },
    points: { type: Number, default: 1 },
  },
  { _id: false }
);

const quizSchema = new Schema<IQuiz>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    afterVideoId: { type: Schema.Types.ObjectId, ref: "Video" },
    order: { type: Number, default: 0 },
    day: { type: Number },
    passingScore: { type: Number, default: 50 },
    questions: { type: [quizQuestionSchema], default: [] },
  },
  { timestamps: true }
);

quizSchema.index({ course: 1, order: 1 });

export default mongoose.model<IQuiz>("Quiz", quizSchema);
