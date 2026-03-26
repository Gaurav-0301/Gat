const mongoose = require('mongoose');

const passSchema = new mongoose.Schema(
  {
    passNumber: {
      type: String,
      unique: true,
      index: true, // ensures faster lookups for verification
      required: true,
    },
    visitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visitor',
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    qrCode: {
      type: String,
      default: null, // generated later
    },
    pdfPath: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
    },
    accessAreas: [String],
    specialInstructions: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// ✅ Auto-generate unique passNumber before validation
passSchema.pre('validate', async function (next) {
  if (!this.passNumber) {
    const date = new Date();
    const formatted = date.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const candidate = `VP${formatted}${random}`;

    // Ensure it's not already taken (rare, but prevents race condition)
    const existing = await mongoose.models.Pass.findOne({ passNumber: candidate });
    if (existing) {
      // If collision, regenerate with a new random number
      this.passNumber = `VP${formatted}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    } else {
      this.passNumber = candidate;
    }
  }
  next();
});

module.exports = mongoose.model('Pass', passSchema);
