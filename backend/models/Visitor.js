const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    trim: true,
  },
  idType: {
    type: String,
    enum: ['passport', 'driving_license', 'national_id', 'other'], // ✅ lowercase to match frontend
    required: true,
  },
  idNumber: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  purpose: {
    type: String,
    required: true,
  },
  vehicleNumber: {
    type: String,
  },
  visitCount: {
    type: Number,
    default: 0,
  },
  lastVisit: {
    type: Date,
  },
  isBlacklisted: {
    type: Boolean,
    default: false,
  },
  blacklistReason: {
    type: String,
  },
}, { timestamps: true });

// ✅ Improve text search performance
visitorSchema.index({ name: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Visitor', visitorSchema);
