const mongoose = require('mongoose');
const User = require('../models/User');
const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const createPendingAppointment = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for appointment creation...');

        // 1. Find a visitor
        const visitor = await Visitor.findOne();
        if (!visitor) {
            throw new Error('No visitor found in the database. Please create a visitor first.');
        }
        console.log(`Found visitor: ${visitor.name}`);

        // 2. Find a host (employee or admin)
        const host = await User.findOne({ role: { $in: ['employee', 'admin'] } });
        if (!host) {
            throw new Error('No host (employee or admin) found in the database.');
        }
        console.log(`Found host: ${host.name}`);

        // 3. Create a new pending appointment for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const newAppointment = new Appointment({
            visitor: visitor._id,
            host: host._id,
            appointmentDate: tomorrow,
            appointmentTime: '10:00',
            duration: 60,
            purpose: 'Test Meeting for Approval Flow',
            location: 'Main Office',
            status: 'pending',
        });

        await newAppointment.save();
        console.log('--- SUCCESS ---');
        console.log(`Created new pending appointment with ID: ${newAppointment._id}`);

    } catch (error) {
        console.error('--- FAILED TO CREATE APPOINTMENT ---');
        console.error(error.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
};

createPendingAppointment();
