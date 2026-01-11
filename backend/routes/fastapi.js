import express from "express";
import multer from "multer";
import { uploadToCloudinary } from "../services/cloudinary.js";
import UnknownDetection from "../models/UnknownDetection.js";
import { verifyToken } from "./auth.js";

const router = express.Router();
const upload = multer();

// Track unknown detections to prevent duplicates
// Format: { userId: { faceEncoding: [numbers], imageUrl, timestamp } }
const unknownFaceCache = new Map();

// Cooldown period: 10 minutes before sending alert for new unknown person
const COOLDOWN_MINUTES = 10;

// Face similarity threshold (0 = identical, 1 = completely different)
const FACE_MATCH_THRESHOLD = 0.6;

/**
 * Check if two face encodings are similar (same person)
 */
const areFacesSimilar = (encoding1, encoding2) => {
  if (!encoding1 || !encoding2 || encoding1.length === 0 || encoding2.length === 0) {
    return false;
  }
  
  let distance = 0;
  for (let i = 0; i < encoding1.length; i++) {
    const diff = encoding1[i] - encoding2[i];
    distance += diff * diff;
  }
  distance = Math.sqrt(distance);
  
  // Lower distance = more similar. Typical threshold is 0.6
  return distance < FACE_MATCH_THRESHOLD;
};

/**
 * Check if face is already detected (same person) and get cached record
 */
const findSimilarFaceDetection = (userId, faceEncoding) => {
  if (!unknownFaceCache.has(userId)) {
    return null;
  }
  
  const userFaces = unknownFaceCache.get(userId);
  
  for (const cachedFace of userFaces) {
    if (areFacesSimilar(faceEncoding, cachedFace.encoding)) {
      return cachedFace;
    }
  }
  
  return null;
};

/**
 * Check if detection should be processed (not in cooldown)
 */
const shouldProcessDetection = (userId, faceEncoding) => {
  const now = Date.now();
  const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
  
  // Check if same person (similar face) already detected
  const cachedFace = findSimilarFaceDetection(userId, faceEncoding);
  
  if (cachedFace) {
    // Same person detected - check if within cooldown
    if (now - cachedFace.timestamp < cooldownMs) {
      console.log(`[Detection] Same person detected within cooldown (${Math.round((now - cachedFace.timestamp) / 1000)}s ago)`);
      return { shouldProcess: false, isDuplicate: true, duplicateId: cachedFace.recordId };
    } else {
      // Same person but cooldown expired - update cache and allow
      cachedFace.timestamp = now;
      console.log(`[Detection] Same person re-detected after cooldown expired - allowing alert`);
      return { shouldProcess: true, isDuplicate: false, newPerson: false };
    }
  }
  
  // New person - add to cache and allow
  if (!unknownFaceCache.has(userId)) {
    unknownFaceCache.set(userId, []);
  }
  
  unknownFaceCache.get(userId).push({
    encoding: faceEncoding,
    timestamp: now,
    recordId: null // Will be set after DB insert
  });
  
  console.log(`[Detection] New unknown person detected`);
  return { shouldProcess: true, isDuplicate: false, newPerson: true };
};

/* Receive unknown detection from FastAPI */
router.post("/event", upload.single("image"), async (req, res) => {
  try {
    const userId = req.body.userId;
    let imageUrl = req.body.imageUrl;
    const categoryName = req.body.categoryName || null;
    const faceEncodingData = req.body.faceEncoding; // Can be array or string

    console.log(`[FastAPI Event] Unknown detection received:`, { userId, imageUrl, categoryName });
    // Debug: log content-type and whether a file was received
    try {
      console.log(`[FastAPI Event] Request Content-Type:`, req.headers && req.headers['content-type']);
      console.log(`[FastAPI Event] File present:`, !!req.file, req.file ? { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : null);
    } catch (dbgErr) {
      console.warn('[FastAPI Event] Debug log error:', dbgErr.message);
    }

    // Always prefer uploading the file we receive to Cloudinary so it is stored and publicly accessible
    let cloudinaryPublicId = null;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          `unknown/${userId}`,
          `${userId}_${Date.now()}`
        );
        imageUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
        console.log('[FastAPI Event] Uploaded unknown image to Cloudinary:', uploadResult.public_id);
      } catch (upErr) {
        console.error("[FastAPI Event] Cloudinary upload error:", upErr);
        return res.status(500).json({ error: "Failed to upload image" });
      }
    } else if (!userId || !imageUrl) {
      // No file and no image URL provided
      return res.status(400).json({ error: "userId and imageUrl required" });
    }

    // Parse face encoding if provided (handle both array and string formats)
    let faceEncoding = null;
    try {
      if (faceEncodingData) {
        // If it's already an array, use it directly. If it's a string, parse it.
        faceEncoding = Array.isArray(faceEncodingData) 
          ? faceEncodingData 
          : JSON.parse(faceEncodingData);
        console.log(`[FastAPI Event] Face encoding received: ${faceEncoding.length} dimensions`);
      }
    } catch (e) {
      console.warn("[FastAPI Event] Could not parse faceEncoding:", e.message);
    }

    // Check if this is a duplicate/similar detection
    const detectionResult = faceEncoding 
      ? shouldProcessDetection(userId, faceEncoding)
      : { shouldProcess: true, isDuplicate: false, newPerson: true };

    // Allow forcing a save for testing: `forceSave=true` either in body or query
    const forceSave = (req.body && req.body.forceSave === 'true') || (req.query && req.query.forceSave === 'true');

    if (!detectionResult.shouldProcess && !forceSave) {
      console.log(`[FastAPI Event] Duplicate person suppressed (cooldown active) for user ${userId}`);
      // Still return ok so FastAPI doesn't retry
      return res.json({ 
        ok: true, 
        duplicateDetection: true, 
        message: "Same person detected within cooldown period",
        duplicateOfId: detectionResult.duplicateId
      });
    }
    if (!detectionResult.shouldProcess && forceSave) {
      console.log(`[FastAPI Event] Duplicate detection received but forceSave=true — storing record for testing`);
    }

    // Store detection in database (only once per person)
    const record = await UnknownDetection.create({
      userId,
      imageUrl,
      cloudinaryPublicId,
      category: categoryName,
      timestamp: new Date()
    });

    // Update cache with record ID so we can track it
    if (faceEncoding && unknownFaceCache.has(userId)) {
      const userFaces = unknownFaceCache.get(userId);
      const lastFace = userFaces[userFaces.length - 1];
      if (lastFace) lastFace.recordId = record._id;
    }

    console.log(`[FastAPI Event] Unknown saved to DB:`, record._id);

    // Send real-time notification to user (only once per person)
    req.io.to(`user:${userId}`).emit("unknown:detected", {
      id: record._id,
      imageUrl: record.imageUrl,
      timestamp: record.timestamp,
      category: categoryName,
      message: `Unknown person detected!`
    });

    console.log(`[FastAPI Event] WebSocket notification sent to user:${userId}`);
    res.json({ ok: true, id: record._id, message: "Unknown detection created" });
  } catch (e) {
    console.error(`[FastAPI Event] Error:`, e);
    res.status(400).json({ error: e.message });
  }
});

/* Get list of unknown detections for authenticated user */
router.get("/unknowns", verifyToken, async (req, res) => {
  try {
    const unknowns = await UnknownDetection.find({ 
      userId: req.user._id 
    }).sort({ timestamp: -1 });
    res.json(unknowns);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* Test endpoint: Simulate unknown detection (for testing without camera) */
router.post("/test-detection", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const userId = req.user._id;
    const { imageUrl, categoryName, faceEncoding } = req.body;

    let testImageUrl = imageUrl || null;
    let cloudinaryPublicId = null;

    // If file uploaded, push to Cloudinary unknown bucket
    const file = req.file;
    if (file) {
      try {
        const uploadResult = await uploadToCloudinary(
          file.buffer,
          `unknown/${userId}`,
          `${userId}_${Date.now()}`
        );
        testImageUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
        console.log('[TEST] Uploaded test unknown image to Cloudinary:', uploadResult.public_id);
      } catch (upErr) {
        console.error("[TEST] Cloudinary upload error:", upErr);
      }
    }

    if (!testImageUrl) testImageUrl = "https://via.placeholder.com/300x300?text=Unknown+Person";

    console.log(`[TEST] Simulating unknown detection for user ${userId}`);

    // Parse face encoding if provided
    let parsedEncoding = null;
    try {
      if (faceEncoding) {
        parsedEncoding = typeof faceEncoding === 'string' ? JSON.parse(faceEncoding) : faceEncoding;
      }
    } catch (e) {
      console.warn("[TEST] Could not parse faceEncoding");
    }

    // Check if this is a duplicate/similar detection
    const detectionResult = parsedEncoding 
      ? shouldProcessDetection(userId, parsedEncoding)
      : { shouldProcess: true, isDuplicate: false, newPerson: true };

    // Allow forcing a save for testing via body param `forceSave=true`
    const forceSave = req.body && req.body.forceSave === 'true';

    if (!detectionResult.shouldProcess && !forceSave) {
      console.log(`[TEST] Duplicate person suppressed (same person detected recently)`);
      return res.json({ 
        ok: true, 
        duplicateDetection: true, 
        message: "Same person detected within cooldown period - not created to prevent spam"
      });
    }
    if (!detectionResult.shouldProcess && forceSave) {
      console.log(`[TEST] Duplicate detection received but forceSave=true — storing record for testing`);
    }

    // Store detection in database
    const record = await UnknownDetection.create({
      userId,
      imageUrl: testImageUrl,
      cloudinaryPublicId,
      category: categoryName || "test",
      timestamp: new Date()
    });

    // Update cache with record ID
    if (parsedEncoding && unknownFaceCache.has(userId)) {
      const userFaces = unknownFaceCache.get(userId);
      const lastFace = userFaces[userFaces.length - 1];
      if (lastFace) lastFace.recordId = record._id;
    }

    // Send real-time notification to user
    req.io.to(`user:${userId}`).emit("unknown:detected", {
      id: record._id,
      imageUrl: record.imageUrl,
      timestamp: record.timestamp,
      category: categoryName || "test",
      message: "Test detection created!"
    });

    console.log(`[TEST] Test detection created:`, record._id);

    res.json({ ok: true, id: record._id, message: "Test detection created" });
  } catch (e) {
    console.error(`[TEST] Error:`, e);
    res.status(400).json({ error: e.message });
  }
});

/* Clear cooldown cache for a specific user (admin endpoint) */
router.post("/clear-detection-cache", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Clear cache for this user
    unknownFaceCache.delete(userId);
    
    console.log(`[CACHE] Cleared unknown face cache for user ${userId}`);
    
    res.json({ ok: true, message: `Unknown face cache cleared for user ${userId}` });
  } catch (e) {
    console.error(`[CACHE] Error:`, e);
    res.status(400).json({ error: e.message });
  }
});

/* Get cache status (for debugging) */
router.get("/detection-cache-status", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userFaces = unknownFaceCache.get(userId);
    
    const cacheInfo = {
      userId,
      cooldownMinutes: COOLDOWN_MINUTES,
      faceMatchThreshold: FACE_MATCH_THRESHOLD,
      cachedFaces: userFaces ? userFaces.length : 0,
      details: userFaces ? userFaces.map((face, idx) => ({
        faceIndex: idx,
        recordId: face.recordId,
        lastDetectedAt: new Date(face.timestamp).toISOString(),
        minutesSinceDetection: Math.round((Date.now() - face.timestamp) / 60000),
        encodingLength: face.encoding ? face.encoding.length : 0
      })) : []
    };
    
    res.json(cacheInfo);
  } catch (e) {
    console.error(`[CACHE] Error:`, e);
    res.status(400).json({ error: e.message });
  }
});

// export default router;

// --- DEBUG ROUTES (temporary) ---
// List recent unknown detection DB records (no auth - local debug only)
router.get('/debug/unknowns', async (req, res) => {
  try {
    const docs = await UnknownDetection.find({}).sort({ timestamp: -1 }).limit(20);
    res.json({ ok: true, count: docs.length, docs });
  } catch (e) {
    console.error('[DEBUG] /debug/unknowns error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Return Cloudinary runtime info
router.get('/debug/cloudinary-info', async (req, res) => {
  try {
    const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || null;
    const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
    res.json({ ok: true, cloudinaryCloudName, hasApiKey });
  } catch (e) {
    console.error('[DEBUG] /debug/cloudinary-info error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
