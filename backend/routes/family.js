import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import FamilyMember from '../models/FamilyMember.js';
import { verifyToken } from './auth.js';
import { reloadEncodings, buildImageUrl } from '../services/fastapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(__dirname, '..', 'data', 'family', String(req.user._id));
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  }
});

router.post('/add', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !req.file) {
      return res.status(400).json({ error: 'Name and image file required' });
    }

    const existing = await FamilyMember.findOne({ userId: req.user._id, name });
    if (existing) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Family member with that name already exists' });
    }

    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path).replace(/\\/g, '/');
    const imageUrl = buildImageUrl(req, relativePath);

    const member = await FamilyMember.create({
      userId: req.user._id,
      name,
      image_path: relativePath,
      imageUrl
    });

    reloadEncodings(req.user._id).catch((e) =>
      console.warn('reloadEncodings failed:', e.message)
    );

    req.io?.emit(`family:updated:${req.user._id}`);
    req.io?.emit('family:updated');

    res.json({
      _id: member._id,
      name: member.name,
      imageUrl: member.imageUrl,
      image_path: member.image_path,
      created_at: member.created_at
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Family add error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', verifyToken, async (req, res) => {
  try {
    const list = await FamilyMember.find({ userId: req.user._id }).sort({ created_at: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const member = await FamilyMember.findOne({ _id: req.params.id, userId: req.user._id });
    if (!member) return res.status(404).json({ error: 'Family member not found' });

    const absPath = path.join(__dirname, '..', member.image_path);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

    await member.deleteOne();

    reloadEncodings(req.user._id).catch(() => {});
    req.io?.emit('family:updated');

    res.json({ message: `Family member '${member.name}' deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
