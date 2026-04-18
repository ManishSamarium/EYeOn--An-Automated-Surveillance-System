import express from 'express';
import FamilyMember from '../models/FamilyMember.js';
import Category from '../models/Category.js';
import { verifySystemToken } from './auth.js';

const router = express.Router();

router.get('/family/:userId', verifySystemToken, async (req, res) => {
  try {
    const list = await FamilyMember.find({ userId: req.params.userId });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/:userId', verifySystemToken, async (req, res) => {
  try {
    const list = await Category.find({ userId: req.params.userId });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
