import express from "express";
import { startSurveillance, stopSurveillance, getSurveillanceStatus, reloadUserFaceCache } from "../services/fastapi.js";
import { verifyToken } from "./auth.js";

const router = express.Router();

// Track active surveillance sessions
const activeSessions = new Map();

/**
 * Start surveillance for authenticated user
 */
router.post("/start", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    if (activeSessions.has(userId)) {
      return res.status(400).json({ error: "Surveillance already running for this user" });
    }

    // Reload face cache before starting
    await reloadUserFaceCache(userId);
    
    // Start surveillance in FastAPI
    const result = await startSurveillance(userId);
    
    // Track session
    activeSessions.set(userId, {
      startTime: new Date(),
      status: "running"
    });
    
    // Notify frontend
    req.io.to(`user:${userId}`).emit("surveillance:started", {
      userId,
      timestamp: new Date()
    });
    
    res.json({ status: "started", userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop surveillance for authenticated user
 */
router.post("/stop", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    
    if (!activeSessions.has(userId)) {
      return res.status(400).json({ error: "No active surveillance for this user" });
    }

    // Stop surveillance
    await stopSurveillance();
    
    // Remove session
    activeSessions.delete(userId);
    
    // Notify frontend
    req.io.to(`user:${userId}`).emit("surveillance:stopped", {
      userId,
      timestamp: new Date()
    });
    
    res.json({ status: "stopped", userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get surveillance status
 */
router.get("/status", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const isActive = activeSessions.has(userId);
    
    res.json({
      isActive,
      userId,
      sessionInfo: isActive ? activeSessions.get(userId) : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
