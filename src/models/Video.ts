import mongoose, { Schema, Document, Types } from "mongoose";

export interface IVideo extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  title: string;
  description?: string;
  url: string;
  order: number;
  durationMinutes?: number;
  isFree: boolean;
  // which day of the course this video belongs to (Day 1, Day 2, ...), for
  // courses structured as a multi-day series rather than a flat playlist
  day?: number;
  // link to a .vtt/.srt subtitle file for this video. Only applied when the
  // video itself is a direct file (mp4/webm/ogg) played in a native <video>
  // tag — YouTube/Vimeo iframes can't accept an external caption track, so
  // for those it's shown as a "captions" link next to the player instead.
  captionsUrl?: string;
}

const videoSchema = new Schema<IVideo>(
  {
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    order: { type: Number, default: 0 },
    durationMinutes: { type: Number },
    // free-preview videos: playable by anyone, without needing granted access
    isFree: { type: Boolean, default: false },
    day: { type: Number },
    captionsUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IVideo>("Video", videoSchema);