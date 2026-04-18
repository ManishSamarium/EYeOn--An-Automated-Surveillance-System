import express from 'express';
import jwt from 'jwt-simple';
import bcryptjs from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SYSTEM_TOKEN = process.env.SYSTEM_TOKEN || 'system-internal-token';

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = {
      _id: decoded._id,
      id: decoded._id,
      email: decoded.email
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const verifySystemToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token !== SYSTEM_TOKEN) {
    return res.status(401).json({ error: 'Invalid system token' });
  }
  next();
};

const issueToken = (user) =>
  jwt.encode({ _id: user._id.toString(), email: user.email }, JWT_SECRET);

router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password and full_name are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const user = new User({
      email,
      password: hashedPassword,
      full_name,
      is_admin: true
    });

    await user.save();

    res.json({
      token: issueToken(user),
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      token: issueToken(user),
      user: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
