// Auto-checkout backfill script
// Sets checkOutTime = checkInTime + AUTO_CHECKOUT_AFTER_MIN for all logs still inside

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const CheckLog = require('../models/CheckLog');

(async () => {
  try {
    await connectDB();
    const argMin = parseInt(process.argv[2], 10);
    const MAX_DURATION_MIN = Number.isFinite(argMin) && argMin > 0
      ? argMin
      : Number(process.env.AUTO_CHECKOUT_AFTER_MIN || 60);
    console.log('Backfill threshold (minutes):', MAX_DURATION_MIN);
    const cutoff = new Date(Date.now() - MAX_DURATION_MIN * 60000);

    const insideTotal = await CheckLog.countDocuments({ checkOutTime: null });
    const candidates = await CheckLog.find({
      checkOutTime: null,
      checkInTime: { $lte: cutoff }
    }).limit(5000);

    console.log('Currently inside (no checkout):', insideTotal);
    console.log('Found candidates to auto-checkout (older than', MAX_DURATION_MIN, 'min):', candidates.length);
    let updated = 0;

    for (const log of candidates) {
      const autoOut = new Date(log.checkInTime.getTime() + MAX_DURATION_MIN * 60000);
      // Only set if computed time is in the past relative to now
      const finalOut = autoOut <= new Date() ? autoOut : new Date();
      log.checkOutTime = finalOut;
      log.notes = `${log.notes ? log.notes + ' ' : ''}[auto-checkout after ${MAX_DURATION_MIN} min]`;
      await log.save();
      updated += 1;
    }

    console.log('Auto-checkout backfill completed. Updated logs:', updated);
    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('Backfill failed:', e?.message || e);
    try { await mongoose.connection.close(); } catch (_) {}
    process.exit(1);
  }
})();
