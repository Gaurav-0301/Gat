require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Routes
const authRoutes = require('./routes/authRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const passRoutes = require('./routes/passRoutes');
const checkLogRoutes = require('./routes/checkLogRoutes');

const app = express();
const CheckLog = require('./models/CheckLog');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS config (allow common local dev frontend origins and any configured FRONTEND_URL)
const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean).concat([
  'http://localhost:3000',
  'http://localhost:3001'
]);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // For development convenience, if FRONTEND_URL not set, allow localhost origins
    const isLocalhost = /localhost(:\d+)?$/.test(origin);
    if (isLocalhost) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Removed verbose request logging middleware used during debugging

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/passes', passRoutes);
app.use('/api/checklogs', checkLogRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Visitor Pass Management API is running ✅' });
});

// Connect DB & Start server
const PORT = process.env.PORT || 5000; // ✅ fallback

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      
      // Verify email configuration on startup
      console.log('\n=== Email Configuration Check ===');
      console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE || '❌ NOT SET');
      console.log('EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
      console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ SET (hidden)' : '❌ NOT SET');
      
      if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️  WARNING: Email service not fully configured!');
        console.log('   Appointment confirmations and QR codes will NOT be sent.');
        console.log('   See EMAIL_TROUBLESHOOTING.md for setup instructions.');
      } else {
        console.log('✓ Email service configuration detected');
        console.log('  Note: Use /api/auth/test-email to verify it works');
      }
      console.log('================================\n');
    });

    // Auto-checkout scheduler: sets checkOutTime to checkInTime + MAX_DURATION
    const MAX_DURATION_MIN = Number(process.env.AUTO_CHECKOUT_AFTER_MIN || 60); // default 60 min
    const INTERVAL_MIN = Number(process.env.AUTO_CHECKOUT_INTERVAL_MIN || 5); // run every 5 min

    const startAutoCheckoutJob = () => {
      const intervalMs = Math.max(INTERVAL_MIN, 1) * 60000;
      setInterval(async () => {
        try {
          const cutoff = new Date(Date.now() - MAX_DURATION_MIN * 60000);
          // Find visitors still inside beyond the max duration
          const candidates = await CheckLog.find({
            checkOutTime: null,
            checkInTime: { $lte: cutoff }
          }).limit(500);

          if (!candidates || candidates.length === 0) return;

          for (const log of candidates) {
            const autoOut = new Date(log.checkInTime.getTime() + MAX_DURATION_MIN * 60000);
            log.checkOutTime = autoOut;
            log.notes = `${log.notes ? log.notes + ' ' : ''}[auto-checkout after ${MAX_DURATION_MIN} min]`;
            await log.save();
          }
        } catch (e) {
          // best-effort job; avoid crashing server
        }
      }, intervalMs);
    };

    startAutoCheckoutJob();
  })
  .catch((err) => console.error('❌ DB Connection Error:', err));

module.exports = app;