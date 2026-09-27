import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }
  const uri = process.env.MONGO_URI as string;
  if (!uri) {
    throw new Error("MONGO_URI is not set in .env");
  }
  await mongoose.connect(uri);
  isConnected = true;
  console.log("MongoDB connected");
};

