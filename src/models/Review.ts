import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  user: Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ course: 1, user: 1 }, { unique: true });
reviewSchema.index({ isFeatured: 1, createdAt: -1 });

export default mongoose.model<IReview>("Review", reviewSchema);
