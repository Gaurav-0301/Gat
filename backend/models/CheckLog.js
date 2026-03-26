const mongoose = require('mongoose');

const checkLogSchema = new mongoose.Schema({
  pass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pass',
    required: true,
  },
  visitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor',
    required: true,
  },
  checkInTime: {
    type: Date,
    required: true,
  },
  checkOutTime: {
    type: Date,
  },
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  checkedOutBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  temperature: {
    type: Number,
  },
  deviceInfo: {
    laptop: { type: Boolean, default: false },
    mobile: { type: Boolean, default: false },
    other: { type: String },
  },
  notes: {
    type: String,
  },
  location: {
    type: String,
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }); // ✅ added toObject

checkLogSchema.virtual('duration').get(function () {
  if (this.checkOutTime) {
    return Math.floor((this.checkOutTime - this.checkInTime) / 60000);
  }
  return null;
});

module.exports = mongoose.model('CheckLog', checkLogSchema);
