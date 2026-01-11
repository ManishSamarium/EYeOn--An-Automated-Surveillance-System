import express from "express";
import multer from "multer";
import { uploadToCloudinary } from "../services/cloudinary.js";
import FamilyMember from "../models/FamilyMember.js";
import { verifyToken } from "./auth.js";

const router = express.Router();
const upload = multer();

router.post("/add", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user._id;
    const name = req.body.name;

    console.log("[FAMILY ADD] Received request:", { 
      hasFile: !!file, 
      fileName: file?.originalname, 
      name, 
      userId 
    });

    if (!file || !name) {
      console.log("[FAMILY ADD] Validation failed:", { file: !!file, name: !!name });
      return res.status(400).json({ error: "Image and name required" });
    }

    console.log("[FAMILY ADD] Uploading to Cloudinary...");
    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      `family-images/${userId}`,
      `${userId}_${Date.now()}`
    );

    console.log("[FAMILY ADD] Cloudinary upload successful:", uploadResult.public_id);
    const publicUrl = uploadResult.secure_url;

    const member = await FamilyMember.create({
      userId,
      name,
      imageUrl: publicUrl,
      cloudinaryPublicId: uploadResult.public_id
    });

    console.log("[FAMILY ADD] Member created in DB:", member._id);
    req.io.emit("family:updated", member);
    res.json(member);
  } catch (e) {
    console.error("[FAMILY ADD] Error:", e)
    res.status(400).json({ error: e.message });
  }
});

router.get("/list", verifyToken, async (req, res) => {
  const list = await FamilyMember.find({ userId: req.user._id });
  res.json(list);
});

router.delete("/:id", verifyToken, async (req, res) => {
  const member = await FamilyMember.findByIdAndDelete(req.params.id);
  if (!member) return res.status(404).json({ error: "Not found" });
  req.io.emit("family:updated");
  res.json({ message: "Deleted" });
});

export default router;
