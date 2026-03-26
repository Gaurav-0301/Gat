require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

const deleteAppointmentByName = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Delete all appointments with purpose starting with "Test Meeting for Approval"
    const result = await Appointment.deleteMany({ 
      purpose: { $regex: '^Test Meeting for Approval', $options: 'i' }
    });
    
    if (result.deletedCount === 0) {
      console.log('No appointments found with purpose starting with "Test Meeting for Approval"');
      process.exit(0);
    }

    console.log(`✓ ${result.deletedCount} appointment(s) deleted successfully`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error deleting appointments:', err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

deleteAppointmentByName();
