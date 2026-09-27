import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI as string;
  if (!uri) {
    throw new Error("MONGO_URI is not set in .env");
  }
  await mongoose.connect(uri);
  console.log("MongoDB connected");
};
