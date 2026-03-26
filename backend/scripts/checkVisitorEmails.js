// scripts/checkVisitorEmails.js
// Check if visitors in appointments have valid emails
// Usage: node backend/scripts/checkVisitorEmails.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Visitor = require('../models/Visitor');

async function checkVisitorEmails() {
    try {
        console.log('\n========================================');
        console.log('🔍 Visitor Email Diagnostic Tool');
        console.log('========================================\n');

        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to database\n');

        // Get all appointments
        const appointments = await Appointment.find()
            .populate('visitor')
            .populate('host', 'name email')
            .sort({ createdAt: -1 })
            .limit(20);

        console.log(`Found ${appointments.length} recent appointments\n`);
        console.log('----------------------------------------');

        let issuesFound = 0;

        for (const apt of appointments) {
            const aptId = apt._id.toString().substring(0, 8);
            const status = apt.status || 'pending';
            
            console.log(`\nAppointment ${aptId}... (${status})`);
            console.log(`  Created: ${apt.createdAt.toLocaleDateString()}`);
            console.log(`  Host: ${apt.host?.name || 'N/A'}`);
            
            if (!apt.visitor) {
                console.log(`  ⚠️  WARNING: No visitor linked to this appointment!`);
                issuesFound++;
            } else {
                console.log(`  Visitor ID: ${apt.visitor._id}`);
                console.log(`  Visitor Name: ${apt.visitor.name || 'N/A'}`);
                
                if (!apt.visitor.email) {
                    console.log(`  ❌ ERROR: Visitor has NO EMAIL!`);
                    issuesFound++;
                } else {
                    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(apt.visitor.email);
                    if (!isValid) {
                        console.log(`  ❌ ERROR: Invalid email format: "${apt.visitor.email}"`);
                        issuesFound++;
                    } else {
                        console.log(`  ✓ Email: ${apt.visitor.email}`);
                    }
                }
                
                if (!apt.visitor.phone) {
                    console.log(`  ⚠️  No phone number`);
                }
            }
            
            console.log(`  Notifications Sent: ${apt.notificationsSent ? 'Yes' : 'No'}`);
        }

        console.log('\n========================================');
        console.log('Summary');
        console.log('========================================');
        console.log(`Total appointments checked: ${appointments.length}`);
        console.log(`Issues found: ${issuesFound}`);
        
        if (issuesFound === 0) {
            console.log('\n✅ All visitors have valid emails!');
            console.log('   The issue is likely with email service configuration.\n');
        } else {
            console.log('\n⚠️  Issues detected!');
            console.log('   Some visitors are missing or have invalid emails.');
            console.log('   This will prevent email notifications from being sent.\n');
        }

        // Check for orphaned visitors (no user account)
        console.log('\n----------------------------------------');
        console.log('Checking for visitor account issues...\n');
        
        const allVisitors = await Visitor.find().populate('user');
        let orphanCount = 0;
        
        for (const visitor of allVisitors) {
            if (!visitor.user) {
                console.log(`❌ Visitor "${visitor.name}" (${visitor.email}) has no linked user account!`);
                orphanCount++;
            }
        }
        
        if (orphanCount > 0) {
            console.log(`\n⚠️  Found ${orphanCount} visitors without user accounts`);
            console.log('   This may cause issues. Run backfillVisitorUser.js to fix.\n');
        } else {
            console.log('✓ All visitors have linked user accounts\n');
        }

        await mongoose.connection.close();
        console.log('Database connection closed.\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkVisitorEmails();
