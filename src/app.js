import express from "express";
import cors from "cors";
import { supabase } from "./config/supabase.js";

import authMiddleware from "./middleware/auth.middleware.js";
import profileRoutes from "./routes/profile.routes.js";
import imageRoutes from "./routes/image.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import adminRoutes from "./routes/admin.routes.js";



const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
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

  res.status(200).json({
    success: true,
    message: "User Profile Management API is running",
    database: "Supabase connected",
  });
});

app.get("/api/test-auth", authMiddleware, (req, res) => {
  res.status(200).json({
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
