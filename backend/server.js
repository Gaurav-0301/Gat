require('dotenv').config(); // Simplified for Render/Production
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

// --- UPDATED CORS CONFIG ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://gat-nine.vercel.app', // Your Vercel URL from screenshot
  process.env.FRONTEND_URL        // From Render Environment Variables
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || /localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests globally
app.options('/*', cors()); 

// --- STATIC ASSETS ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/passes', passRoutes);
app.use('/api/checklogs', checkLogRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'Gatekeeper API is live ✅',
    timestamp: new Date().toISOString()
  });
});

// --- SERVER & DB CONNECTION ---
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      
      // Professional Config Logs
      console.log('\n=== System Check ===');
      console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'Using Localhost Defaults');
      console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE ? '✓' : '❌');
      console.log('CLOUDINARY:', process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '❌');
      console.log('====================\n');
    });

    // Auto-checkout scheduler
    const MAX_DURATION_MIN = Number(process.env.AUTO_CHECKOUT_AFTER_MIN || 60);
    const INTERVAL_MIN = Number(process.env.AUTO_CHECKOUT_INTERVAL_MIN || 5);

    const startAutoCheckoutJob = () => {
      const intervalMs = Math.max(INTERVAL_MIN, 1) * 60000;
      setInterval(async () => {
        try {
          const cutoff = new Date(Date.now() - MAX_DURATION_MIN * 60000);
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
          console.error('Auto-checkout background job error:', e.message);
        }
      }, intervalMs);
    };

    startAutoCheckoutJob();
  })
  .catch((err) => console.error('❌ DB Connection Error:', err));

module.exports = app;