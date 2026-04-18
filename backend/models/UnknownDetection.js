import mongoose from 'mongoose';

const unknownDetectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  image_path: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  assigned_to: {
    type: String,
    default: null
  },
  is_processed: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('UnknownDetection', unknownDetectionSchema);
