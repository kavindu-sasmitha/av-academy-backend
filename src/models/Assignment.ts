import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  title: string;
  description: string;
  pdfUrl?: string; // Data URI or URL
  pdfName?: string;
  dueDate?: Date;
  maxMarks: number;
  afterVideoId?: Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    pdfUrl: { type: String },
    pdfName: { type: String },
    dueDate: { type: Date },
    maxMarks: { type: Number, default: 100 },
    afterVideoId: { type: Schema.Types.ObjectId, ref: "Video" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

assignmentSchema.index({ course: 1, order: 1 });

export default mongoose.model<IAssignment>("Assignment", assignmentSchema);
