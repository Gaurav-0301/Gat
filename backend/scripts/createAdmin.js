require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const admin = await User.signup(
            'Admin User',
            'admin@example.com',
            'Admin@123',
            '1234567890',
            'admin',
            'Administration'
        );

        console.log('Admin user created:', admin.email);
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error.message);
        process.exit(1);
    }
};

createAdmin();