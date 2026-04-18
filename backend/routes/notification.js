import express from 'express';
import Notification from '../models/Notification.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.get('/list', verifyToken, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user._id })
      .sort({ created_at: -1 })
      .limit(100);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mark-read/:id', verifyToken, async (req, res) => {
  try {
    const note = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Notification not found' });
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const note = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!note) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
