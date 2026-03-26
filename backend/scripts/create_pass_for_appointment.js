// Create a pass for an existing appointment
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Appointment = require('../models/Appointment');
const Pass = require('../models/Pass');
const Visitor = require('../models/Visitor');
const User = require('../models/User');

const appointmentId = process.argv[2] || '6944649f847475d27e6f8f79';

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`Creating pass for appointment: ${appointmentId}\n`);

    // Get the appointment with all required fields
    const appointment = await Appointment.findById(appointmentId)
      .populate('visitor')
      .populate('host');

    if (!appointment) {
      console.log('❌ Appointment not found');
      process.exit(1);
    }

    console.log('Appointment details:');
    console.log(`  Date: ${appointment.appointmentDate}`);
    console.log(`  Duration: ${appointment.duration} minutes`);
    console.log(`  Visitor: ${appointment.visitor?.name} (${appointment.visitor?._id})`);
    console.log(`  Host: ${appointment.host?.name} (${appointment.host?._id})\n`);

    // Calculate valid time window
    const base = new Date(appointment.appointmentDate);
    const durationMinutes = Number(appointment.duration) || 60;
    const bufferBeforeMin = 30;
    const bufferAfterMin = 30;
    const validFrom = new Date(base.getTime() - bufferBeforeMin * 60000);
    const validUntil = new Date(base.getTime() + (durationMinutes + bufferAfterMin) * 60000);

    console.log('Pass validity window:');
    console.log(`  Valid From: ${validFrom.toLocaleString('en-IN')}`);
    console.log(`  Valid Until: ${validUntil.toLocaleString('en-IN')}`);
    const now = new Date();
    const inWindow = now >= validFrom && now <= validUntil;
    console.log(`  Currently valid: ${inWindow ? '✅ YES' : '❌ NO'}\n`);

    // Check if pass already exists
    const existingPass = await Pass.findOne({ 
      appointment: appointmentId,
      status: 'active'
    });

    if (existingPass) {
      console.log(`⚠️  Active pass already exists: ${existingPass.passNumber}`);
      process.exit(0);
    }

    // Create the pass
    console.log('Creating new pass...');
    const newPass = new Pass({
      visitor: appointment.visitor?._id,
      appointment: appointment._id,
      issuedBy: appointment.approvedBy,
      host: appointment.host?._id,
      validFrom,
      validUntil,
      status: 'active'
    });

    await newPass.save();
    console.log(`\n✅ Pass created successfully!`);
    console.log(`   Pass Number: ${newPass.passNumber}`);
    console.log(`   Pass ID: ${newPass._id}`);
    console.log(`   Status: ${newPass.status}`);

    // Verify the pass works
    console.log('\nVerifying pass...');
    const pass = await Pass.findById(newPass._id)
      .populate('visitor', 'name email')
      .populate('host', 'name department');

    if (pass) {
      console.log('✅ Pass retrieved successfully');
      console.log(`   Visitor: ${pass.visitor?.name}`);
      console.log(`   Host: ${pass.host?.name}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done! You can now scan the QR with appointmentId: ' + appointmentId);
  } catch (err) {
    console.error('❌ Error:', err?.message || err);
    process.exit(1);
  }
})();
