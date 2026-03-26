require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

(async () => {
  const email = (process.env.RESET_EMAIL || 'admin@example.com').toLowerCase();
  const newPass = process.env.RESET_PASSWORD || 'Admin@123';
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set');
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email });
    if (!user) throw new Error(`User not found for email: ${email}`);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPass, salt);
    await user.save();
    console.log(`Password reset for ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
