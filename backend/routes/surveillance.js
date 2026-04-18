import express from 'express';
import { verifyToken } from './auth.js';

const router = express.Router();

const running = new Map();

router.post('/start', verifyToken, async (req, res) => {
  const userId = String(req.user._id);
  running.set(userId, true);
  req.io?.emit('surveillance:started', { userId });
  res.json({ status: 'started', mode: 'browser' });
});

router.post('/stop', verifyToken, async (req, res) => {
  const userId = String(req.user._id);
  running.set(userId, false);
  req.io?.emit('surveillance:stopped', { userId });
  res.json({ status: 'stopped', mode: 'browser' });
});

router.get('/status', verifyToken, async (req, res) => {
  res.json({
    is_running: !!running.get(String(req.user._id)),
    mode: 'browser'
  });
});

export default router;
