
import express from "express";
import cors from "cors";
import { supabase } from "./config/supabase.js";

import authMiddleware from "./middleware/auth.middleware.js";
import profileRoutes from "./routes/profile.routes.js";
import imageRoutes from "./routes/image.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://profile-management-system-frontend.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  const { error } = await supabase.from("profiles").select("id").limit(1);

  if (error) {
    return res.status(500).json({
      success: false,
      message: "Supabase connection failed",
      error: error.message,
    });
  }

  return res.status(200).json({
    success: true,
    message: "User Profile Management API is running",
    database: "Supabase connected",
  });
});

app.get("/api/test-auth", authMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authentication middleware working",
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

app.use("/api/profile", profileRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorMiddleware);

export default app;
