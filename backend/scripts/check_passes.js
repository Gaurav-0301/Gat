// Check what passes exist in the database
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Pass = require('../models/Pass');
const Appointment = require('../models/Appointment');
const Visitor = require('../models/Visitor');
const User = require('../models/User');

const appointmentId = process.argv[2] || '6944649f847475d27e6f8f79';

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log(`Looking for passes linked to appointment: ${appointmentId}\n`);

    // Check all passes (raw)
    console.log('=== All passes in database ===');
    const allPasses = await Pass.find({}).limit(5).lean();
    console.log(`Total passes: ${allPasses.length}`);
    allPasses.forEach((p, i) => {
      console.log(`${i + 1}. Pass: ${p.passNumber}, Appointment: ${p.appointment}, Status: ${p.status}`);
    });

    console.log('\n=== Looking for pass with appointment ID ===');
    
    // Try the query the backend uses
    const pass1 = await Pass.findOne({ 
      appointment: appointmentId,
      status: 'active'
    });
    console.log('Query 1 (string ID): ', pass1 ? `✅ Found: ${pass1.passNumber}` : '❌ Not found');

    // Try with ObjectId
    const pass2 = await Pass.findOne({ 
      appointment: new mongoose.Types.ObjectId(appointmentId),
      status: 'active'
    });
    console.log('Query 2 (ObjectId): ', pass2 ? `✅ Found: ${pass2.passNumber}` : '❌ Not found');

    // Try searching by pass number
    console.log('\n=== Looking for pass by number ===');
    const pass3 = await Pass.findOne({ passNumber: appointmentId });
    console.log('Query 3 (passNumber): ', pass3 ? `✅ Found: ${pass3.passNumber}` : '❌ Not found');

    // Find all passes for this appointment (regardless of status)
    console.log('\n=== All passes for this appointment (any status) ===');
    const allForAppt = await Pass.find({ appointment: appointmentId }).lean();
    if (allForAppt.length > 0) {
      allForAppt.forEach(p => {
        console.log(`  - ${p.passNumber} (Status: ${p.status}, ID: ${p._id})`);
      });
    } else {
      console.log('  None found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err?.message || err);
    process.exit(1);
  }
})();
