import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  thumbnail?: string;
  category?: string;
  price?: number;
  instructorName?: string;
  instructorTitle?: string;
  instructorBio?: string;
  instructorAvatar?: string;
  // short video shown (autoplaying, muted) on the course card when the visitor hovers it
  previewVideoUrl?: string;
  paymentDetails?: string;
  // WhatsApp number (with country code, e.g. "+94771234567") a student can
  // message to send proof of payment after paying — rendered as a tap-to-chat link
  whatsappNumber?: string;
  createdBy: Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    thumbnail: { type: String },
    category: { type: String },
    price: { type: Number, default: 0 },
    instructorName: { type: String, trim: true },
    instructorTitle: { type: String, trim: true },
    instructorBio: { type: String },
    instructorAvatar: { type: String },
    previewVideoUrl: { type: String },
    // shown to logged-in users who don't have access yet, so they know how to pay
    // (bank details / payment instructions) before an admin manually grants access
    paymentDetails: { type: String },
    whatsappNumber: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>("Course", courseSchema);