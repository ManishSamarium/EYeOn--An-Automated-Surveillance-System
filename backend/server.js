import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('io', io);

for (const dir of ['data/family', 'data/categories', 'data/unknown']) {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.use(
  '/data',
  (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, 'data'))
);

app.use((req, _res, next) => {
  req.io = io;
  next();
});

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI missing; exiting');
  process.exit(1);
}

mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB error:', err.message);
    process.exit(1);
  });

import './models/User.js';
import './models/FamilyMember.js';
import './models/Category.js';
import './models/UnknownDetection.js';
import './models/Notification.js';

import authRoutes from './routes/auth.js';
import familyRoutes from './routes/family.js';
import categoryRoutes from './routes/categories.js';
import surveillanceRoutes from './routes/surveillance.js';
import unknownRoutes from './routes/unknown.js';
import fastapiRoutes from './routes/fastapi.js';
import notificationRoutes from './routes/notification.js';
import internalRoutes from './routes/internal.js';

app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/unknown', unknownRoutes);
app.use('/api/fastapi', fastapiRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/internal', internalRoutes);

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('subscribe', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.path}` }));

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
