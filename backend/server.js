require('dotenv').config();
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

// --- CORS CONFIG ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://gat-nine.vercel.app', 
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || /localhost(:\d+)?$/.test(origin);
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// FIXED: Using a named parameter catch-all to satisfy Node v22 parser
app.options('/:any*', cors()); 

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
    message: 'Gatekeeper API is live ✅'
  });
});

// --- SERVER & DB CONNECTION ---
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // Auto-checkout scheduler
    const MAX_DURATION_MIN = Number(process.env.AUTO_CHECKOUT_AFTER_MIN || 60);
    const INTERVAL_MIN = Number(process.env.AUTO_CHECKOUT_INTERVAL_MIN || 5);

    setInterval(async () => {
      try {
        const cutoff = new Date(Date.now() - MAX_DURATION_MIN * 60000);
        const candidates = await CheckLog.find({
          checkOutTime: null,
          checkInTime: { $lte: cutoff }
        }).limit(500);

        for (const log of candidates) {
          log.checkOutTime = new Date(log.checkInTime.getTime() + MAX_DURATION_MIN * 60000);
          log.notes = `${log.notes ? log.notes + ' ' : ''}[auto-checkout]`;
          await log.save();
        }
      } catch (e) {
        console.error('Job error:', e.message);
      }
    }, Math.max(INTERVAL_MIN, 1) * 60000);
  })
  .catch((err) => console.error('❌ DB Connection Error:', err));

module.exports = app;