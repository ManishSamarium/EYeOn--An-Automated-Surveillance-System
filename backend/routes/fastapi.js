import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import UnknownDetection from '../models/UnknownDetection.js';
import Notification from '../models/Notification.js';
import { verifySystemToken } from './auth.js';
import { buildImageUrl } from '../services/fastapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/event', verifySystemToken, upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!req.file) return res.status(400).json({ error: 'image required' });

    const userDir = path.join(__dirname, '..', 'data', 'unknown', String(userId));
    fs.mkdirSync(userDir, { recursive: true });
    const filename = `unknown_${Date.now()}.jpg`;
    const absPath = path.join(userDir, filename);
    fs.writeFileSync(absPath, req.file.buffer);

    const relativePath = path
      .relative(path.join(__dirname, '..'), absPath)
      .replace(/\\/g, '/');
    const imageUrl = buildImageUrl(req, relativePath);

    const record = await UnknownDetection.create({
      userId,
      image_path: relativePath,
      imageUrl,
      timestamp: new Date()
    });

    await Notification.create({
      userId,
      type: 'unknown_detected',
      message: 'Unknown person detected',
      imageUrl
    });

    const io = req.app.get('io');
    io?.emit(`notify:${userId}`, {
      _id: record._id,
      imageUrl,
      timestamp: record.timestamp,
      type: 'unknown_detected'
    });
    io?.emit('unknown:detected', { userId, imageUrl, timestamp: record.timestamp });

    res.json({ ok: true, _id: record._id });
  } catch (error) {
    console.error('fastapi event error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/category-event', verifySystemToken, express.json(), async (req, res) => {
  try {
    const { userId, categoryName } = req.body;
    if (!userId || !categoryName) {
      return res.status(400).json({ error: 'userId and categoryName required' });
    }

    await Notification.create({
      userId,
      type: 'category_detected',
      message: `${categoryName} arrived`
    });

    const io = req.app.get('io');
    io?.emit(`notify:${userId}`, {
      type: 'category_detected',
      message: `${categoryName} arrived`,
      timestamp: new Date()
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
