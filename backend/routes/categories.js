import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Category from '../models/Category.js';
import { verifyToken } from './auth.js';
import { reloadEncodings, buildImageUrl } from '../services/fastapi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(__dirname, '..', 'data', 'categories', String(req.user._id));
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
    const { name, description } = req.body;

    if (!name || !req.file) {
      return res.status(400).json({ error: 'Name and image file required' });
    }

    const existing = await Category.findOne({ userId: req.user._id, name });
    if (existing) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Category already exists' });
    }

    const relativePath = path
      .relative(path.join(__dirname, '..'), req.file.path)
      .replace(/\\/g, '/');
    const imageUrl = buildImageUrl(req, relativePath);

    const category = await Category.create({
      userId: req.user._id,
      name,
      description: description || '',
      image_path: relativePath,
      imageUrl
    });

    reloadEncodings(req.user._id).catch((e) =>
      console.warn('reloadEncodings failed:', e.message)
    );

    req.io?.emit('category:updated');

    res.json({
      _id: category._id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      image_path: category.image_path,
      created_at: category.created_at,
      message: `Category '${name}' created successfully`
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Category add error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/list', verifyToken, async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ created_at: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const absPath = path.join(__dirname, '..', category.image_path);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

    await category.deleteOne();

    reloadEncodings(req.user._id).catch(() => {});
    req.io?.emit('category:updated');

    res.json({ message: `Category '${category.name}' deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
