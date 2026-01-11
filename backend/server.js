import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
console.log("MongoDB connection starting...");

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jwt-simple";

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS - Allow all localhost variants (5173, 5174, 5175, 5176, etc.)
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests from localhost on any port
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Make socket available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

// Models
import "./models/User.js";
import "./models/FamilyMember.js";
import "./models/Category.js";
import "./models/UnknownDetection.js";

// Routes
import authRoutes from "./routes/auth.js";
import familyRoutes from "./routes/family.js";
import categoryRoutes from "./routes/categories.js";
import surveillanceRoutes from "./routes/surveillance.js";
import unknownRoutes from "./routes/unknown.js";
import notificationRoutes from "./routes/notification.js";
import fastapiRoutes from "./routes/fastapi.js";

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/family", familyRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/surveillance", surveillanceRoutes);
app.use("/api/unknown", unknownRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/fastapi", fastapiRoutes);

// Socket.IO Connection with Authentication
io.on("connection", socket => {
  console.log("Client connected:", socket.id);
  
  // Handle authentication
  socket.on("authenticate", (token) => {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      console.log(`[AUTH] Attempting to decode token...`);
      // jwt-simple expects the same secret used for encoding
      const decoded = jwt.decode(token, secret, true, 'HS256');
      const userId = decoded._id || decoded.id;
      
      // Join user-specific room
      socket.join(`user:${userId}`);
      socket.userId = userId;
      
      console.log(`✓ User ${userId} authenticated on socket ${socket.id}`);
      socket.emit("authenticated", { userId, socketId: socket.id });
    } catch (error) {
      console.error("✗ Socket authentication error:", error.message);
      socket.emit("auth_error", { message: "Invalid token" });
    }
  });
  
  // Disconnect handler
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id, socket.userId);
  });
  
  // Error handler
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("Frontend URL:", process.env.FRONTEND_URL || "http://localhost:5173");
  console.log("FastAPI URL:", process.env.FASTAPI_URL || "http://127.0.0.1:8000");
});
