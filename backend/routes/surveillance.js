import express from 'express';
import {
  startSurveillance,
  stopSurveillance,
  getSurveillanceStatus
} from '../services/fastapi.js';
import { verifyToken } from './auth.js';

const router = express.Router();

router.post('/start', verifyToken, async (req, res) => {
  try {
    const result = await startSurveillance(req.user._id);
    req.io?.emit('surveillance:started', { userId: req.user._id });
    res.json({ status: 'started', ...(result?.data || {}) });
  } catch (error) {
    console.error('start surveillance error:', error.message);
    res.status(502).json({
      error: 'Failed to start surveillance service',
      detail: error.message
    });
  }
});

router.post('/stop', verifyToken, async (req, res) => {
  try {
    await stopSurveillance(req.user._id);
    req.io?.emit('surveillance:stopped', { userId: req.user._id });
    res.json({ status: 'stopped' });
  } catch (error) {
    console.error('stop surveillance error:', error.message);
    res.status(502).json({
      error: 'Failed to stop surveillance service',
      detail: error.message
    });
  }
});

router.get('/status', verifyToken, async (req, res) => {
  try {
    const result = await getSurveillanceStatus(req.user._id);
    res.json({ is_running: !!result?.data?.is_running });
  } catch (error) {
    res.json({ is_running: false });
  }
});

export default router;
