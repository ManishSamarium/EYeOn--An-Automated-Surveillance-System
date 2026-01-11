import mongoose from 'mongoose';

const unknownDetectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: String,
    default: null
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: null
  }
});

export default mongoose.model('UnknownDetection', unknownDetectionSchema);
