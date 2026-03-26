const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Visitor = require('../models/Visitor');
const User = require('../models/User');

const backfillVisitorUser = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const visitorsNeedingLink = await Visitor.find({
      $or: [
        { user: { $exists: false } },
        { user: null },
      ],
    });

    console.log('Visitors missing user link:', visitorsNeedingLink.length);

    let updatedCount = 0;

    for (const visitor of visitorsNeedingLink) {
      const normalizedEmail = (visitor.email || '').trim().toLowerCase();

      if (!normalizedEmail) {
        console.log('Skipping visitor with missing email:', visitor._id.toString());
        continue;
      }

      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        console.log('No matching user for visitor:', visitor._id.toString(), 'email:', normalizedEmail);
        continue;
      }

      visitor.user = user._id;
      await visitor.save();
      updatedCount += 1;

      console.log('Linked visitor', visitor._id.toString(), 'email:', normalizedEmail, '-> user', user._id.toString());
    }

    console.log('Backfill complete. Updated', updatedCount, 'of', visitorsNeedingLink.length, 'visitors.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

backfillVisitorUser();
