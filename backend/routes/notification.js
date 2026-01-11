import express from 'express';
import { verifyToken } from './auth.js';
import UnknownDetection from '../models/UnknownDetection.js';

const router = express.Router();

/**
 * Get notifications for authenticated user
 */
router.get('/list', verifyToken, async (req, res) => {
  try {
    const notifications = await UnknownDetection.find(
      { userId: req.user._id }
    ).sort({ timestamp: -1 }).limit(50);
    
    res.json(notifications);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Mark notification as processed
 */
router.put('/:id/process', verifyToken, async (req, res) => {
  try {
    const notification = await UnknownDetection.findByIdAndUpdate(
      req.params.id,
      { isProcessed: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Classify unknown detection
 */
router.put('/:id/classify', verifyToken, async (req, res) => {
  try {
    const { assignedTo, category } = req.body;
    
    const notification = await UnknownDetection.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo: assignedTo || null,
        category: category || null,
        isProcessed: true
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    req.io.to(`user:${req.user._id}`).emit('notification:classified', notification);
    res.json(notification);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * Delete notification
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const notification = await UnknownDetection.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    req.io.to(`user:${req.user._id}`).emit('notification:deleted', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
