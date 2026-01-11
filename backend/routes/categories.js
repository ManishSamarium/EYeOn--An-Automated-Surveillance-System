import express from "express";
import multer from "multer";
import { uploadToCloudinary } from "../services/cloudinary.js";
import Category from "../models/Category.js";
import { verifyToken } from "./auth.js";
import axios from "axios";

const router = express.Router();
const upload = multer();

/* ADD CATEGORY */
router.post("/add", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user._id;
    const file = req.file;

    if (!name || !file) return res.status(400).json({ error: "Name and image required" });

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      `categories/${userId}`,
      `${userId}_${Date.now()}`
    );

    const publicUrl = uploadResult.secure_url;

    // Call FastAPI to encode
    const { data: fastapiData } = await axios.post(`${process.env.FASTAPI_URL}/encode`, {
      image_url: publicUrl,
      userId,
      name
    });

    if (!fastapiData.success) return res.status(400).json({ error: "No face detected" });

    const cat = await Category.create({
      userId,
      name,
      description,
      imageUrl: publicUrl,
      cloudinaryPublicId: uploadResult.public_id
    });

    req.io.emit("category:updated", cat);
    res.json(cat);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* LIST */
router.get("/list", verifyToken, async (req, res) => {
  res.json(await Category.find({ userId: req.user._id }));
});

/* DELETE */
router.delete("/:id", verifyToken, async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ error: "Not found" });
  req.io.emit("category:updated");
  res.json({ message: "Deleted" });
});

export default router;
