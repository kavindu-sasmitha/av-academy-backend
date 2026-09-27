import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import courseRoutes from "./routes/courseRoutes";
import adminRoutes from "./routes/adminRoutes";
import publicRoutes from "./routes/publicRoutes";

dotenv.config();

const app = express();

// ── Allowed CORS origins ────────────────────────────────────────────────────
// Reads a comma-separated ALLOWED_ORIGINS env var so you can add more domains
// without changing code. Falls back to the production URLs + localhost.
const ALLOWED_ORIGINS: string[] = (
  process.env.ALLOWED_ORIGINS ||
  [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://av-academy-3cf7.vercel.app",
    "https://www.avacademy.lk",
    "https://avacademy.lk",
  ].join(",")
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());

// Ensure database connection is active before processing requests (crucial for serverless)
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection middleware error:", err);
    next(err);
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/admin", adminRoutes);

// simple error handler (fallback)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;

// When running locally or as a persistent server (not on Vercel serverless)
if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB:", err.message);
      process.exit(1);
    });
}

export default app;
