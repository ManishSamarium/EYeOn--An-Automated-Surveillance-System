import mongoose from 'mongoose';

const familyMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  image_path: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

familyMemberSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model('FamilyMember', familyMemberSchema);
