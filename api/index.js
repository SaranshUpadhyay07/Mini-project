import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";

import connectDB from "./config/db.config.js";
import { setupSocket } from "./socketHandler.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import placesRoutes from "./routes/places.routes.js";
import familyRoutes from "./routes/family.routes.js";

// Load environment variables
dotenv.config();
console.log("[API] [bootstrap] environment variables loaded");

// Connect to MongoDB
console.log("[API] [bootstrap] connecting to database");
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
console.log(`[API] [bootstrap] resolved port ${PORT}`);

// --------------------
// Middleware
// --------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log("[API] [bootstrap] middleware registered");

// --------------------
// Base Routes
// --------------------
app.get("/", (req, res) => {
  console.log("[API] [rootRoute] handling request");
  res.json({
    message: "Welcome to Patha Gamini API",
    version: "1.0.0",
    status: "Server is running",
  });
  console.log("[API] [rootRoute] response sent");
});

app.get("/health", (req, res) => {
  console.log("[API] [healthRoute] handling request");
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
  console.log("[API] [healthRoute] response sent");
});

// --------------------
// API Routes
// --------------------
app.use("/api/auth", authRoutes); // signup / signin / sync
app.use("/api/users", userRoutes); // profile (me, update)
app.use("/api/places", placesRoutes); // map / places APIs
app.use("/api/family", familyRoutes); // family tracking & management
console.log("[API] [bootstrap] routes registered");

// --------------------
// 404 Handler
// --------------------
app.use((req, res) => {
  console.warn(`[API] [notFoundHandler] route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
  });
});

// --------------------
// Global Error Handler
// --------------------
app.use((err, req, res, next) => {
  console.error("[API] [globalErrorHandler] unhandled error:", err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// --------------------
// Start Server with Socket.io
// --------------------
const httpServer = createServer(app);
console.log("[API] [bootstrap] http server created");
const io = setupSocket(httpServer);
console.log("[API] [bootstrap] socket server initialized");

httpServer.listen(PORT, () => {
  console.log(`[API] [serverStart] server listening on port ${PORT}`);
  console.log(`[API] [serverStart] api endpoint http://localhost:${PORT}`);
  console.log("[API] [serverStart] socket.io ready");
});

export default app;
