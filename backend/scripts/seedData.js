const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Visitor = require('../models/Visitor');

const seedData = async () => {
  try {
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'Loaded ✓' : 'Missing ✗');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data to avoid duplicates
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Visitor.deleteMany({});

    console.log('Creating users...');

    // 1. CREATE 1 ADMIN
    const admin = await User.signup('System Admin', 'admin@gatekeeper.com', 'Admin@123456', '+919876543210', 'admin', 'Management');

    // 2. CREATE 3 HOSTS (EMPLOYEES)
    const host1 = await User.signup('Employee1', 'employee1@gatekeeper.com', 'Host@123456', '+919876543211', 'employee', 'IT Dept');
    const host2 = await User.signup('Employee2', 'employee2@gatekeeper.com', 'Host@123456', '+919876543212', 'employee', 'HR Dept');
    const host3 = await User.signup('Employee3', 'employee3@gatekeeper.com', 'Host@123456', '+919876543213', 'employee', 'Finance');

    // 3. CREATE 2 SECURITY
    const sec1 = await User.signup('Security Alpha', 'security1@gatekeeper.com', 'Sec@123456', '+919876543214', 'security', 'Main Gate');
    const sec2 = await User.signup('Security Beta', 'security2@gatekeeper.com', 'Sec@123456', '+919876543215', 'security', 'Reception');

    console.log('✓ Created 1 Admin, 3 Hosts, and 2 Security users');

    // Create 3 sample visitors
    const visitors = await Visitor.create([
      {
        name: 'Alice Johnson',
        email: 'alice@external.com',
        phone: '+919000000001',
        company: 'Tech Corp',
        idType: 'national_id',
        idNumber: 'NID12345',
        purpose: 'Interview',
        visitCount: 1
      },
      {
        name: 'Bob Smith',
        email: 'bob@external.com',
        phone: '+919000000002',
        company: 'Freelance',
        idType: 'driving_license',
        idNumber: 'DL67890',
        purpose: 'Maintenance',
        visitCount: 3
      }
    ]);

    console.log('✓ Created sample visitors');
    console.log('\n========================================');
    console.log('      SEED DATA SUMMARY (COPY THESE)    ');
    console.log('========================================');
    console.log(`ADMIN:    admin@gatekeeper.com      / Admin@123456`);
    console.log(`HOST 1:   rajesh@gatekeeper.com     / Host@123456`);
    console.log(`HOST 2:   priya@gatekeeper.com      / Host@123456`);
    console.log(`HOST 3:   amit@gatekeeper.com       / Host@123456`);
    console.log(`SEC 1:    security1@gatekeeper.com  / Sec@123456`);
    console.log(`SEC 2:    security2@gatekeeper.com  / Sec@123456`);
    console.log('========================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();