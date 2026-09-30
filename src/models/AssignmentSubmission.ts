import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAssignmentSubmission extends Document {
  _id: Types.ObjectId;
  assignment: Types.ObjectId;
  course: Types.ObjectId;
  student: Types.ObjectId;
  fileUrl?: string; // Data URI or URL
  fileName?: string;
  notes?: string;
  marks?: number;
  maxMarks: number;
  feedback?: string;
  status: "submitted" | "graded";
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileUrl: { type: String },
    fileName: { type: String },
    notes: { type: String, trim: true },
    marks: { type: Number },
    maxMarks: { type: Number, default: 100 },
    feedback: { type: String, trim: true },
    status: { type: String, enum: ["submitted", "graded"], default: "submitted" },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date },
    gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
assignmentSubmissionSchema.index({ course: 1, student: 1 });

export default mongoose.model<IAssignmentSubmission>(
  "AssignmentSubmission",
  assignmentSubmissionSchema
);
