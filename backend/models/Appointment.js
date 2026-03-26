const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentDate: { type: Date, required: true },
  appointmentTime: { type: String, required: true },
  duration: { type: Number, default: 60 },
  purpose: { type: String, required: true },
  location: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date,
  rejectionReason: String,
  notes: String,
  visitorPhoto: { type: String }, // URL or path to visitor photo
  notificationsSent: { type: Boolean, default: false },
}, { timestamps: true });

// ✅ Prevent scheduling appointments in the past
appointmentSchema.pre('save', function (next) {
  if (this.appointmentDate && this.appointmentDate < new Date()) {
    return next(new Error('Appointment date cannot be in the past.'));
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
