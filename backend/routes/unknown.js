import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import UnknownDetection from '../models/UnknownDetection.js';
import FamilyMember from '../models/FamilyMember.js';
import Category from '../models/Category.js';
import { verifyToken } from './auth.js';
import { buildImageUrl, reloadEncodings } from '../services/fastapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/list', verifyToken, async (req, res) => {
  try {
    const list = await UnknownDetection.find({ userId: req.user._id }).sort({ timestamp: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/assign', verifyToken, async (req, res) => {
  try {
    const { detection_id, assigned_to, assign_as } = req.body;

    if (!detection_id || !assigned_to) {
      return res.status(400).json({ error: 'detection_id and assigned_to are required' });
    }

    const record = await UnknownDetection.findOne({
      _id: detection_id,
      userId: req.user._id
    });
    if (!record) return res.status(404).json({ error: 'Detection not found' });

    const target = assign_as === 'category' ? 'categories' : 'family';
    const targetDir = path.join(__dirname, '..', 'data', target, String(req.user._id));
    fs.mkdirSync(targetDir, { recursive: true });

    const srcPath = path.join(__dirname, '..', record.image_path);

    if (fs.existsSync(srcPath)) {
      const destFileName = `${Date.now()}-${assigned_to.replace(/[^a-zA-Z0-9._-]/g, '_')}.jpg`;
      const destAbs = path.join(targetDir, destFileName);
      fs.copyFileSync(srcPath, destAbs);

      const destRelative = path
        .relative(path.join(__dirname, '..'), destAbs)
        .replace(/\\/g, '/');
      const imageUrl = buildImageUrl(req, destRelative);

      if (assign_as === 'category') {
        const existing = await Category.findOne({ userId: req.user._id, name: assigned_to });
        if (!existing) {
          await Category.create({
            userId: req.user._id,
            name: assigned_to,
            description: 'Assigned from unknown detection',
            image_path: destRelative,
            imageUrl
          });
        }
      } else {
        const existing = await FamilyMember.findOne({ userId: req.user._id, name: assigned_to });
        if (!existing) {
          await FamilyMember.create({
            userId: req.user._id,
            name: assigned_to,
            image_path: destRelative,
            imageUrl
          });
        }
      }
    }

    record.assigned_to = assigned_to;
    record.is_processed = true;
    await record.save();

    reloadEncodings(req.user._id).catch(() => {});
    req.io?.emit('family:updated');
    req.io?.emit('category:updated');

    res.json({ message: 'Assigned successfully', record });
  } catch (error) {
    console.error('Unknown assign error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const record = await UnknownDetection.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!record) return res.status(404).json({ error: 'Detection not found' });

    const absPath = path.join(__dirname, '..', record.image_path);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

    await record.deleteOne();
    res.json({ message: 'Detection deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
