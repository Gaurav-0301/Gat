const mongoose = require('mongoose');
const Pass = require('../models/Pass');
const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment');
const { generateQRCode } = require('../utils/qrGenerator');
const { generatePassPDF } = require('../utils/pdfGenerator');
const { sendPassDetails } = require('../utils/emailService');
const { sendSMS } = require('../utils/smsService');

// Get the latest active pass for the logged-in visitor (resolve Visitor by user)
const getMyActivePass = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Resolve the visitor profile linked to this user
    const visitor = await Visitor.findOne({ user: userId }).select('_id name email');

    if (!visitor) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No visitor profile found for this user",
      });
    }

    const pass = await Pass.findOne({
      visitor: visitor._id,
      status: 'active',
    })
      .sort({ createdAt: -1 })
      .populate('visitor', 'name email phone')
      .populate('host', 'name department');

    if (!pass) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No active pass found",
      });
    }

    return res.status(200).json({
      success: true,
      data: pass,
    });
  } catch (err) {
    console.error("❌ getMyActivePass error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Issue a new pass
const issuePass = async (req, res) => {
  try {
    const {
      visitorId,
      appointmentId,
      hostId,
      validFrom,
      validUntil,
      accessAreas,
      specialInstructions
    } = req.body;

    // Resolve appointment details if provided (to ensure explicit linkage)
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId).populate('visitor').populate('host');
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
    }

    // Determine visitor to link: prefer appointment.visitor, fallback to provided visitorId; if missing, resolve via authenticated user
    let resolvedVisitorId = (appointment && appointment.visitor) ? appointment.visitor._id : visitorId;
    if (!resolvedVisitorId) {
      const visitorForUser = await Visitor.findOne({ user: req.user._id }).select('_id');
      if (visitorForUser) {
        resolvedVisitorId = visitorForUser._id;
      } else {
        return res.status(400).json({ error: 'Visitor is required to issue a pass (from appointment, visitorId, or user-linked visitor)' });
      }
    }

    // Determine host to link: prefer provided hostId, fallback to appointment.host
    const resolvedHostId = hostId || (appointment && appointment.host ? appointment.host._id : null);
    if (!resolvedHostId) {
      return res.status(400).json({ error: 'Host is required to issue a pass (hostId or appointment host)' });
    }

    // Try to resolve visitor if an id was provided. Do not block issuance
    // if the visitor record is missing; allow passes to be created from
    // external/temporary visitor info.
    let visitor = null;
    if (resolvedVisitorId) {
      visitor = await Visitor.findById(resolvedVisitorId);
      // If visitor exists, check blacklist status
      if (visitor && visitor.isBlacklisted) {
        return res.status(403).json({ error: 'Cannot issue pass to blacklisted visitor' });
      }
    }

    // Create pass (ensure visitor is stored as ObjectId)
    const pass = new Pass({
      visitor: new mongoose.Types.ObjectId(resolvedVisitorId),
      appointment: appointmentId || (appointment ? appointment._id : undefined),
      issuedBy: req.user._id,
      host: resolvedHostId,
      validFrom: validFrom || new Date(),
      validUntil,
      accessAreas,
      specialInstructions,
      status: 'active'
    });

    // Generate pass number (pre-save hook will handle this)
    await pass.save();

    // Generate QR code with pass data
    const qrData = {
      passNumber: pass.passNumber,
      visitorId: visitor ? visitor._id : resolvedVisitorId || null,
      visitorName: visitor ? visitor.name : 'Visitor',
      validFrom: pass.validFrom,
      validUntil: pass.validUntil,
      appointmentId: appointment ? appointment._id : (appointmentId || null),
      issuedBy: req.user?._id || null
    };

    const qrCodeDataURL = await generateQRCode(qrData);
    pass.qrCode = qrCodeDataURL;

    // Populate pass for PDF generation (sanitize returned fields)
    await pass.populate([
      { path: 'visitor', select: 'name email phone photo' },
      { path: 'host', select: 'name email phone department' },
      { path: 'appointment' }
    ]);

    // Generate PDF badge
    const pdfPath = await generatePassPDF(pass, qrCodeDataURL);
    pass.pdfPath = pdfPath;

    await pass.save();

    // Send pass to visitor via email if we have visitor details
    if (visitor && visitor.email) {
      try {
        await sendPassDetails(pass, visitor, pdfPath);
      } catch (emailErr) {
        console.warn('Failed to send pass email:', emailErr?.message || emailErr);
      }
    }

    // Also send an SMS notification to the visitor (best-effort) if phone available
    try {
      if (visitor && visitor.phone) {
        const smsMsg = `Your visitor pass ${pass.passNumber} is issued and valid from ${new Date(pass.validFrom).toLocaleString()} to ${new Date(pass.validUntil).toLocaleString()}.`;
        await sendSMS(visitor.phone, smsMsg);
      }
    } catch (smsErr) {
      console.warn('Failed to send pass SMS:', smsErr?.message || smsErr);
    }

    res.status(201).json(pass);
  } catch (error) {
    console.error('Error issuing pass:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get all passes
const getAllPasses = async (req, res) => {
  try {
    const { status, visitorId, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }

    if (visitorId) {
      query.visitor = visitorId;
    }

    const passes = await Pass.find(query)
      .populate('visitor')
      .populate('host', 'name department')
      .populate('issuedBy', 'name')
      .populate('appointment')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Pass.countDocuments(query);

    res.status(200).json({
      passes,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalPasses: count
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get single pass
const getPass = async (req, res) => {
  try {
    const { id } = req.params;
    const pass = await Pass.findById(id)
      .populate('visitor')
      .populate('host', 'name email phone department')
      .populate('issuedBy', 'name')
      .populate('appointment');

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    res.status(200).json(pass);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Verify pass by pass number or appointmentId
const verifyPass = async (req, res) => {
  try {
    const coerceToStringId = (value) => {
      if (value == null) return '';
      if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
      if (typeof value === 'object') {
        if (value.$oid) return String(value.$oid).trim();
        if (value._id) return coerceToStringId(value._id);
        if (value.hexString) return String(value.hexString).trim();
        if (typeof value.toString === 'function') {
          const s = value.toString();
          if (typeof s === 'string' && s !== '[object Object]') return s.trim();
        }
        return '';
      }
      return '';
    };

    const { passNumber: paramPassNumber } = req.params;
    const rawBodyValue = req.body?.value ?? req.body?.passNumber ?? req.body?.appointmentId;
    const passNumber = coerceToStringId(paramPassNumber || rawBodyValue);
    
    if (!passNumber || passNumber === '[object Object]') {
      return res.status(400).json({ valid: false, error: 'Invalid value to verify' });
    }

    let pass = null;

    // 1. Try to resolve as appointmentId (QR scan)
    if (passNumber && mongoose.Types.ObjectId.isValid(passNumber)) {
      const appointment = await Appointment.findById(passNumber)
        .populate('visitor')
        .populate('host', 'name department');

      if (appointment) {
        pass = await Pass.findOne({ 
          appointment: new mongoose.Types.ObjectId(passNumber),
          status: 'active'
        })
        .populate('visitor')
        .populate('host', 'name department');
        
        // Auto-issue pass if missing
        if (!pass) {
          try {
            const base = new Date(appointment.appointmentDate);
            const durationMinutes = Number(appointment.duration) || 60;
            const newPass = new Pass({
              visitor: appointment.visitor?._id,
              appointment: appointment._id,
              host: appointment.host?._id,
              validFrom: new Date(base.getTime() - 30 * 60000),
              validUntil: new Date(base.getTime() + (durationMinutes + 30) * 60000),
              status: 'active'
            });
            await newPass.save();
            pass = await Pass.findById(newPass._id)
              .populate('visitor')
              .populate('host', 'name department');
          } catch (e) {
            console.warn('[VerifyPass] Auto-issue failed:', e.message);
          }
        }
      }
    }

    // 2. Fallback to passNumber lookup
    if (!pass) {
      pass = await Pass.findOne({ passNumber })
        .populate('visitor')
        .populate('host', 'name department');
    }

    if (!pass) {
      return res.status(404).json({ valid: false, error: 'Pass not found' });
    }

    // 3. Status Check (Active/Inactive)
    if (pass.status !== 'active') {
      return res.status(400).json({ 
        valid: false, 
        error: `Pass is ${pass.status}` 
      });
    }

    /** * TIME VALIDATION REMOVED 
     * The pass will now verify regardless of validFrom/validUntil constraints.
     */

    // 4. Blacklist Check
    const visitor = await Visitor.findById(pass.visitor);
    if (visitor && visitor.isBlacklisted) {
      return res.status(403).json({ valid: false, error: 'Visitor is blacklisted' });
    }

    // 5. Photo Normalization & Response
    let appointmentDetails = null;
    if (pass.appointment) {
      appointmentDetails = await Appointment.findById(pass.appointment)
        .select('visitorPhoto appointmentDate appointmentTime location purpose');
    }

    const normalizePhotoPath = (p) => {
      if (!p) return null;
      let rel = String(p).trim();
      if (/^https?:\/\//i.test(rel)) return rel;
      if (!rel.startsWith('/uploads/')) {
        if (rel.startsWith('uploads/')) rel = `/${rel}`;
        else rel = `/uploads/${rel.replace(/^\/+/, '')}`;
      }
      return rel;
    };

    const chosenPhoto = normalizePhotoPath(appointmentDetails?.visitorPhoto) || normalizePhotoPath(pass?.visitor?.photo);

    res.status(200).json({
      valid: true,
      pass,
      visitorPhoto: chosenPhoto
    });

  } catch (error) {
    console.error('[VerifyPass] Error:', error);
    res.status(400).json({ valid: false, error: error.message });
  }
};

// Revoke pass
const revokePass = async (req, res) => {
  try {
    const { id } = req.params;

    const pass = await Pass.findByIdAndUpdate(
      id,
      { status: 'revoked' },
      { new: true }
    ).populate('visitor');

    if (!pass) {
      return res.status(404).json({ error: 'Pass not found' });
    }

    res.status(200).json(pass);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update pass status (auto-expire)
const updateExpiredPasses = async (req, res) => {
  try {
    const now = new Date();
    
    const result = await Pass.updateMany(
      { 
        validUntil: { $lt: now },
        status: 'active'
      },
      { status: 'expired' }
    );

    res.status(200).json({ 
      message: 'Expired passes updated',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get pass statistics
const getPassStats = async (req, res) => {
  try {
    const stats = {
      total: await Pass.countDocuments(),
      active: await Pass.countDocuments({ status: 'active' }),
      expired: await Pass.countDocuments({ status: 'expired' }),
      revoked: await Pass.countDocuments({ status: 'revoked' })
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  issuePass,
  getAllPasses,
  getPass,
  verifyPass,
  revokePass,
  updateExpiredPasses,
  getPassStats,
  getMyActivePass
};