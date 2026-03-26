// controllers/checkLogController.js

const CheckLog = require('../models/CheckLog');
const Pass = require('../models/Pass');
const Visitor = require('../models/Visitor');
const { sendEmail } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

/**
 * Check-in visitor
 */
const checkIn = async (req, res) => {
  try {
    const {
      passId,
      appointmentId,
      visitorId,
      temperature,
      deviceInfo,
      notes,
      location
    } = req.body;

    // Resolve passId: try appointmentId first if it's a valid ObjectId
    let resolvedPassId = passId;
    const mongoose = require('mongoose');
    
    if (appointmentId && mongoose.Types.ObjectId.isValid(appointmentId) && !resolvedPassId) {
      const Pass = require('../models/Pass');
      const foundPass = await Pass.findOne({ appointment: appointmentId, status: 'active' });
      if (foundPass) {
        resolvedPassId = foundPass._id;
      }
    }

    // Validate required fields
    if (!resolvedPassId || !visitorId) {
      return res.status(400).json({ error: 'passId (or appointmentId) and visitorId are required' });
    }

    // Verify pass is valid
    const pass = await Pass.findById(resolvedPassId).populate('visitor');

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    if (pass.status !== 'active') {
      return res.status(400).json({ error: `Pass is ${pass.status}` });
    }

    // Check if visitor is already checked in for this pass
    const existingCheckIn = await CheckLog.findOne({
      pass: resolvedPassId,
      checkOutTime: null
    });

    if (existingCheckIn) {
      return res.status(400).json({ error: 'Visitor is already checked in' });
    }

    // Create check-in log
    const checkLog = await CheckLog.create({
      pass: resolvedPassId,
      visitor: visitorId,
      checkInTime: new Date(),
      checkedInBy: req.user && req.user._id ? req.user._id : undefined,
      temperature,
      deviceInfo,
      notes,
      location
    });

    // Update visitor stats (visit count + lastVisit)
    try {
      const v = await Visitor.findById(visitorId);
      if (v) {
        v.visitCount = (v.visitCount || 0) + 1;
        v.lastVisit = new Date();
        await v.save();
      }
    } catch (e) {
      console.warn('Failed to update visitor stats:', e?.message || e);
    }

    // Populate the log
    const populatedLog = await CheckLog.findById(checkLog._id)
      .populate('visitor')
      .populate('pass')
      .populate('checkedInBy', 'name');
    // Send notifications: email to host (if pass.host populated) and SMS to visitor and host (best-effort)
    try {
      // populate pass host
      await populatedLog.populate({ path: 'pass', populate: { path: 'host', select: 'name email phone' } });
      const host = populatedLog.pass?.host;

      // Email to host
      if (host && host.email) {
        const html = `
          <h2>Visitor Checked In</h2>
          <p>Dear ${host.name},</p>
          <p>Your visitor ${populatedLog.visitor.name} has checked in at ${new Date(populatedLog.checkInTime).toLocaleString()}.</p>
          <ul>
            <li><strong>Visitor:</strong> ${populatedLog.visitor.name} (${populatedLog.visitor.email})</li>
            <li><strong>Phone:</strong> ${populatedLog.visitor.phone}</li>
            <li><strong>Location:</strong> ${populatedLog.location || 'N/A'}</li>
          </ul>
        `;
        await sendEmail(host.email, 'Visitor Checked In', html);
      }

      // SMS to visitor
      try {
        if (populatedLog.visitor && populatedLog.visitor.phone) {
          const msg = `You have checked in at ${new Date(populatedLog.checkInTime).toLocaleString()} for ${populatedLog.location || 'your appointment'}.`;
          await sendSMS(populatedLog.visitor.phone, msg);
        }
      } catch (e) {
        console.warn('Failed to send SMS to visitor:', e?.message || e);
      }

      // SMS to host
      try {
        if (host && host.phone) {
          const msg = `${populatedLog.visitor.name} has checked in at ${new Date(populatedLog.checkInTime).toLocaleString()}.`;
          await sendSMS(host.phone, msg);
        }
      } catch (e) {
        console.warn('Failed to send SMS to host:', e?.message || e);
      }
    } catch (notifyErr) {
      console.warn('Check-in notification error:', notifyErr?.message || notifyErr);
    }

    return res.status(201).json(populatedLog);
  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Check-out visitor
 */
const checkOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Check log id is required' });
    }

    const checkLog = await CheckLog.findById(id);

    if (!checkLog) {
      return res.status(404).json({ error: 'Check-in log not found' });
    }

    if (checkLog.checkOutTime) {
      return res.status(400).json({ error: 'Visitor already checked out' });
    }

    checkLog.checkOutTime = new Date();
    checkLog.checkedOutBy = req.user && req.user._id ? req.user._id : undefined;
    if (notes) checkLog.notes = (checkLog.notes || '') + ' ' + notes;

    await checkLog.save();

    const populatedLog = await CheckLog.findById(checkLog._id)
      .populate('visitor')
      .populate('pass')
      .populate('checkedInBy', 'name')
      .populate('checkedOutBy', 'name');

    return res.status(200).json(populatedLog);
  } catch (error) {
    console.error('Check-out error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get check logs with filters
 */
const getAllCheckLogs = async (req, res) => {
  try {
    const {
      date,
      visitorId,
      status,
      page = 1,
      limit = 10
    } = req.query;

    // ensure page & limit are numbers
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

    let query = {};

    // Filter by date (expects YYYY-MM-DD or any date string parseable by Date)
    if (date) {
      const startDate = new Date(date);
      if (!isNaN(startDate)) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        query.checkInTime = { $gte: startDate, $lt: endDate };
      }
    }

    // Filter by visitor
    if (visitorId) {
      query.visitor = visitorId;
    }

    // Filter by status
    if (status === 'checked-in') {
      query.checkOutTime = null;
    } else if (status === 'checked-out') {
      query.checkOutTime = { $ne: null };
    }

    const [checkLogs, count] = await Promise.all([
      CheckLog.find(query)
        .populate('visitor')
        .populate('pass')
        .populate('checkedInBy', 'name')
        .populate('checkedOutBy', 'name')
        .sort({ checkInTime: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
      CheckLog.countDocuments(query)
    ]);

    return res.status(200).json({
      checkLogs,
      totalPages: Math.ceil(count / limitNum),
      currentPage: pageNum,
      totalCheckLogs: count
    });
  } catch (error) {
    console.error('GetAllCheckLogs error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get single check log
 */
const getCheckLog = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Check log id is required' });
    }

    const checkLog = await CheckLog.findById(id)
      .populate('visitor')
      .populate('pass')
      .populate('checkedInBy', 'name')
      .populate('checkedOutBy', 'name');

    if (!checkLog) {
      return res.status(404).json({ error: 'Check log not found' });
    }

    return res.status(200).json(checkLog);
  } catch (error) {
    console.error('GetCheckLog error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get currently checked-in visitors
 */
const getCurrentVisitors = async (req, res) => {
  try {
    const currentVisitors = await CheckLog.find({ checkOutTime: null })
      .populate('visitor')
      .populate('pass')
      .populate('checkedInBy', 'name')
      .sort({ checkInTime: -1 });

    return res.status(200).json(currentVisitors);
  } catch (error) {
    console.error('GetCurrentVisitors error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get check log statistics
 */
const getCheckLogStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      currentlyInside,
      todayCheckIns,
      todayCheckOuts,
      totalVisits,
      todayLogs
    ] = await Promise.all([
      CheckLog.countDocuments({ checkOutTime: null }),
      CheckLog.countDocuments({
        checkInTime: { $gte: today, $lt: tomorrow }
      }),
      CheckLog.countDocuments({
        checkOutTime: { $gte: today, $lt: tomorrow }
      }),
      CheckLog.countDocuments(),
      CheckLog.find({
        checkInTime: { $gte: today, $lt: tomorrow },
        checkOutTime: { $ne: null }
      })
    ]);

    const stats = {
      currentlyInside,
      todayCheckIns,
      todayCheckOuts,
      totalVisits
    };

    if (todayLogs.length > 0) {
      const totalDuration = todayLogs.reduce((sum, log) => {
        const duration = (log.checkOutTime - log.checkInTime) / (1000 * 60); // minutes
        return sum + duration;
      }, 0);
      stats.averageVisitDuration = Math.round(totalDuration / todayLogs.length);
    } else {
      stats.averageVisitDuration = 0;
    }

    return res.status(200).json(stats);
  } catch (error) {
    console.error('GetCheckLogStats error:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Get visitor history by visitorId
 */
const getVisitorHistory = async (req, res) => {
  try {
    const { visitorId } = req.params;
    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    const history = await CheckLog.find({ visitor: visitorId })
      .populate('pass')
      .populate('checkedInBy', 'name')
      .populate('checkedOutBy', 'name')
      .sort({ checkInTime: -1 });

    return res.status(200).json(history);
  } catch (error) {
    console.error('GetVisitorHistory error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getAllCheckLogs,
  getCheckLog,
  getCurrentVisitors,
  getCheckLogStats,
  getVisitorHistory
};
