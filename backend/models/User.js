const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true, // ✅ Keep only this
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
  },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'security', 'employee', 'visitor'],
    default: 'employee',
  },
  department: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });


// Signup static
userSchema.statics.signup = async function (name, email, password, phone, role, department) {
  if (!name || !email || !password || !phone)
    throw new Error('All fields must be filled');
  if (!validator.isEmail(email))
    throw new Error('Invalid email');
  if (!validator.isStrongPassword(password))
    throw new Error('Weak password');

  const existing = await this.findOne({ email });
  if (existing)
    throw new Error('Email already in use');

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const user = await this.create({
    name, email, password: hash, phone, role: (role || 'employee').toString().toLowerCase(), department
  });

  return user;
};

// Login static
userSchema.statics.login = async function (email, password) {
  if (!email || !password)
    throw new Error('All fields must be filled');

  const normalizedEmail = (email || '').toString().trim().toLowerCase();
  const user = await this.findOne({ email: normalizedEmail });
  if (!user) throw new Error('Incorrect email');
  if (!user.isActive) throw new Error('User account is deactivated');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Incorrect password');

  return user;
};

module.exports = mongoose.model('User', userSchema);
