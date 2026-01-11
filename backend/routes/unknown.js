import express from "express";
import UnknownDetection from "../models/UnknownDetection.js";
import { verifyToken } from "./auth.js";

const router = express.Router();

/**
 * Get list of unknown detections for authenticated user
 */
router.get("/list", verifyToken, async (req, res) => {
  try {
    const list = await UnknownDetection.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Assign unknown person to a family member or category
 */
router.post("/assign/:id", verifyToken, async (req, res) => {
  try {
    const { assignToFamily, assignToCategory } = req.body;
    
    const record = await UnknownDetection.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: assignToFamily || null,
        category: assignToCategory || null,
        isProcessed: true
      },
      { new: true }
    );
    
    if (!record) {
      return res.status(404).json({ error: "Unknown not found" });
    }
    
    // Notify via Socket.IO
    req.io.to(`user:${req.user._id}`).emit("unknown:classified", record);
    
    res.json(record);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Delete an unknown detection
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const record = await UnknownDetection.findByIdAndDelete(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: "Unknown not found" });
    }
    
    // Notify via Socket.IO
    req.io.to(`user:${req.user._id}`).emit("unknown:deleted", req.params.id);
    
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
