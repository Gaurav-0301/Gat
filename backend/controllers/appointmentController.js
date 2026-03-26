// controllers/appointmentController.js  (fixed)
const Appointment = require('../models/Appointment');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const Pass = require('../models/Pass');
const { sendAppointmentConfirmation, sendEmail } = require('../utils/emailService');
const { sendAppointmentSMS } = require('../utils/smsService');

const { generateQRCode } = require('../utils/qrGenerator');

// Helper: build Date from possible shapes
const buildAppointmentDate = (dateInput, timeInput) => {
  if (!dateInput) return null;

  // If time is provided, always combine date and time explicitly in LOCAL time
  if (timeInput && /^\d{2}:\d{2}$/.test(timeInput)) {
    const [y, m, d] = String(dateInput).split('-').map((n) => parseInt(n, 10));
    const [hh, mm] = String(timeInput).split(':').map((n) => parseInt(n, 10));
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) && Number.isFinite(hh) && Number.isFinite(mm)) {
      const combined = new Date(y, m - 1, d, hh, mm, 0, 0);
      if (!Number.isNaN(combined.getTime())) return combined;
    }
  }

  // Otherwise, if the input already includes a time (ISO or similar), parse directly
  if (typeof dateInput === 'string' && /(T|\s)\d{1,2}:\d{2}/.test(dateInput)) {
    const direct = new Date(dateInput);
    if (!Number.isNaN(direct.getTime())) return direct;
  }

  // Fallback: try parsing date-only (local midnight). This should be rare because time is required.
  const [y, m, d] = String(dateInput).split('-').map((n) => parseInt(n, 10));
  if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
    const onlyDate = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (!Number.isNaN(onlyDate.getTime())) return onlyDate;
  }

  return null;
};

// Create appointment
const createAppointment = async (req, res) => {
  try {
    const {
      visitorId,
      hostId,
      appointmentDate,
      appointmentTime,
      duration,
      purpose,
      location,
      notes
    } = req.body;

    // 1. Validate photo upload 
    // This MUST match the 'photo' key we used in the frontend FormData.append('photo', ...)
    if (!req.file) {
      return res.status(400).json({ error: 'Visitor photo is required' });
    }

    // 2. Basic validation
    if (!hostId || !purpose || !location) {
      return res.status(400).json({ error: 'hostId, purpose and location are required' });
    }

    let finalVisitorId = visitorId;
    let visitor = null;

    // 3. Resolve visitor logic
    if (req.user && req.user.role === 'visitor') {
      visitor = await Visitor.findOne({ user: req.user._id });

      if (!visitor) {
        const authUser = await User.findById(req.user._id);
        if (!authUser) {
          return res.status(400).json({ error: 'User account not found' });
        }

        visitor = await Visitor.create({
          user: authUser._id,
          name: authUser.name || 'Visitor',
          email: (authUser.email || '').toLowerCase(),
          phone: authUser.phone || 'N/A',
          company: '',
          idType: 'other',
          idNumber: `AUTO-${Date.now()}`,
          photo: 'uploads/visitors/placeholder.jpg',
          address: '',
          purpose: purpose || 'Visitor appointment',
          vehicleNumber: '',
          visitCount: 0,
          lastVisit: new Date()
        });
      }

      if (visitor.isBlacklisted) {
        return res.status(403).json({ error: 'Cannot create appointment for blacklisted visitor' });
      }
      finalVisitorId = visitor._id;
    } else if (finalVisitorId) {
      visitor = await Visitor.findById(finalVisitorId);
      if (visitor && visitor.isBlacklisted) {
        return res.status(403).json({ error: 'Cannot create appointment for blacklisted visitor' });
      }
    }

    // 4. Validate Host
    const host = await User.findById(hostId);
    if (!host) return res.status(404).json({ error: 'Host not found' });
    
    const hostRole = (host.role || '').toString().toLowerCase();
    if (hostRole !== 'employee') {
      return res.status(400).json({ error: 'Appointments can only be scheduled with employee hosts' });
    }
    if (host.isActive === false) {
      return res.status(400).json({ error: 'Selected host is not active' });
    }

    // 5. Date Logic
    // Make sure buildAppointmentDate is imported and working
    const appointmentDateObj = typeof buildAppointmentDate === 'function' 
      ? buildAppointmentDate(appointmentDate, appointmentTime)
      : new Date(`${appointmentDate}T${appointmentTime || '00:00'}`);

    if (!appointmentDateObj || isNaN(appointmentDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date or time' });
    }

    const normalizedTime = appointmentTime || appointmentDateObj.toTimeString().slice(0, 5);

    // 6. Photo Path Logic
    // We use the 'photo' key from the request file provided by Cloudinary/Multer
    const photoPath = req.file.secure_url || req.file.path || null;

    // 7. Create Appointment
  
try {
// Ensure you have this line ABOVE the creation block:
// const appointmentDateObj = buildAppointmentDate(appointmentDate, appointmentTime);

const newAppointment = await Appointment.create({
  visitor: visitor ? visitor._id : (finalVisitorId || undefined),
  host: host?._id || hostId, 
  appointmentDate: appointmentDateObj, 
  appointmentTime: appointmentTime || appointmentDateObj.toTimeString().slice(0, 5), 
  duration: Number(duration) || 60,
  purpose,
  location,
  notes,
  visitorPhoto: req.file.secure_url || req.file.path,
  status: 'pending',
  createdBy: req.user?._id
});

    // Ensure we await the populate and check if it exists
    const populated = await Appointment.findById(newAppointment._id)
      .populate('visitor')
      .populate({ path: 'host', select: 'name email phone department' });

    return res.status(201).json({ success: true, appointment: populated });
} catch (createErr) {
    console.error("Creation Error:", createErr);
    return res.status(500).json({ error: "Database save failed", details: createErr.message });
}

    // 8. Populate and Respond
    const populatedAppointment = await newAppointment.populate([
      { path: 'visitor' }, 
      { path: 'host', select: 'name email phone department' }
    ]);

    // 9. Email Notification (Non-blocking)
    try {
      if (typeof sendEmail === 'function') {
        const visitorDisplayName = visitor ? visitor.name : 'Guest';
        const hostEmailHtml = `
          <h2>New Appointment Request</h2>
          <p>Dear ${host.name},</p>
          <p>You have a new appointment request from ${visitorDisplayName} for ${appointmentDateObj.toLocaleDateString()} at ${normalizedTime}.</p>
        `;
        sendEmail(host.email, 'New Appointment Request', hostEmailHtml);
      }
    } catch (mailErr) {
      console.warn('Email failed:', mailErr.message);
    }

    return res.status(201).json({ success: true, appointment: populatedAppointment });

  } catch (err) {
    console.error('CRITICAL ERROR:', err);
    // Ensuring we return JSON so the frontend doesn't get a "SyntaxError"
    return res.status(500).json({ 
      error: 'Server error while creating appointment', 
      details: err.message 
    });
  }
};



// Public create appointment (for visitors who are not logged in)
const createAppointmentPublic = async (req, res) => {
  try {
    const {
      visitorId,
      hostId,
      appointmentDate,
      appointmentTime,
      duration,
      purpose,
      location,
      notes
    } = req.body;

    // hostId, purpose and location are required; visitor is optional for public creation
    if (!hostId || !purpose || !location) {
      return res.status(400).json({ error: 'hostId, purpose and location are required' });
    }

    let visitor = null;
    if (visitorId) {
      visitor = await Visitor.findById(visitorId);
      if (visitor && visitor.isBlacklisted) {
        return res.status(403).json({ error: 'Cannot create appointment for blacklisted visitor' });
      }
    }

    const host = await User.findById(hostId);
    if (!host) return res.status(404).json({ error: 'Host not found' });
    const hostRole = (host.role || '').toString().toLowerCase();
    if (hostRole !== 'employee') {
      return res.status(400).json({ error: 'Appointments can only be scheduled with employee hosts' });
    }
    if (host.isActive === false) {
      return res.status(400).json({ error: 'Selected host is not active' });
    }

    const appointmentDateObj = buildAppointmentDate(appointmentDate, appointmentTime);
    if (!appointmentDateObj) {
      return res.status(400).json({ error: 'Invalid or missing appointmentDate. Provide ISO datetime or YYYY-MM-DD with appointmentTime (HH:MM).' });
    }

    const now = new Date();
    if (appointmentDateObj <= now) {
      return res.status(400).json({ error: 'Appointment date/time cannot be in the past' });
    }

    const normalizedTime = appointmentTime && /^\d{2}:\d{2}$/.test(appointmentTime)
      ? appointmentTime
      : appointmentDateObj.toTimeString().slice(0, 5);

    // Use uploaded photo if provided (Cloudinary secure_url preferred, fallback to path)
    const photoPath = req.file ? (req.file.secure_url || req.file.path || null) : null;
    console.log('[createAppointmentPublic] file:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      secure_url: req.file.secure_url,
      path: req.file.path
    } : null, 'photoPath:', photoPath);

    const newAppointment = await Appointment.create({
      visitor: visitor ? visitor._id : undefined,
      host: host._id,
      appointmentDate: appointmentDateObj,
      appointmentTime: normalizedTime,
      duration: Number(duration) || 60,
      purpose,
      location,
      notes,
      visitorPhoto: photoPath,
      status: 'pending'
    });

    const populatedAppointment = await newAppointment.populate([{ path: 'visitor' }, { path: 'host', select: 'name email phone department' }]); // Optimized: populate directly on created doc 'name email phone department');

    // Notify host (best-effort)
    try {
      const visitorDisplayName = visitor ? visitor.name : (req.body.visitorName || 'Guest');
      const hostEmailHtml = `
        <h2>New Appointment Request</h2>
        <p>Dear ${host.name},</p>
        <p>You have a new appointment request:</p>
        <ul>
          <li><strong>Visitor:</strong> ${visitorDisplayName}</li>
          <li><strong>Date:</strong> ${appointmentDateObj.toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${normalizedTime}</li>
          <li><strong>Purpose:</strong> ${purpose}</li>
        </ul>
        <p>Please review and approve/reject this appointment.</p>
      `;
      sendEmail(host.email, 'New Appointment Request', hostEmailHtml);
    } catch (mailErr) {
      console.warn('Failed to send new appointment email to host:', mailErr?.message || mailErr);
    }

    return res.status(201).json({ success: true, appointment: populatedAppointment });
  } catch (err) {
    console.error('Error creating public appointment:', err);
    return res.status(500).json({ error: 'Server error while creating appointment', details: err.message });
  }
};

// Get all appointments
const getAllAppointments = async (req, res) => {
  try {
    let { status, date, hostId, page = 1, limit = 10 } = req.query;
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;

    const query = {};

    if (status) query.status = status;

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    // Employees can only see their own appointments
    if (req.user && req.user.role === 'employee') {
      query.host = req.user._id;
    } else if (hostId) {
      query.host = hostId;
    }

    const appointments = await Appointment.find(query)
      .populate('visitor')
      .populate('host', 'name email phone department')
      .populate('approvedBy', 'name')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const count = await Appointment.countDocuments(query);

    return res.status(200).json({
      appointments,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalAppointments: count
    });
  } catch (err) {
    console.error('getAllAppointments error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Get single appointment
const getAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate('visitor')
      .populate('host', 'name email phone department')
      .populate('approvedBy', 'name');

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Employees can only access their own appointments
    if (req.user && req.user.role === 'employee') {
      const hostId = appointment.host?._id?.toString();
      if (!hostId || hostId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: not your appointment' });
      }
    }

    return res.status(200).json(appointment);
  } catch (err) {
    console.error('getAppointment error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Authenticated: Get appointments for the currently logged-in visitor
const getMyAppointments = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if Visitor profile exists for this User
    let visitorDoc = await Visitor.findOne({ user: req.user._id });

    // FIX: If no visitor profile exists yet, return an empty list instead of a 400 error
    // This prevents the Dashboard from crashing for new users.
    if (!visitorDoc) {
      return res.status(200).json({ appointments: [], message: "No visitor profile found yet." });
    }

    const appointments = await Appointment.find({ visitor: visitorDoc._id })
      .populate('visitor', 'name email phone')
      .populate('host', 'name email department')
      .populate('approvedBy', 'name')
      .sort({ appointmentDate: -1, appointmentTime: -1 });

    return res.status(200).json({ appointments });
  } catch (err) {
    console.error('getMyAppointments error:', err);
    return res.status(500).json({ error: 'Server error fetching appointments' });
  }
};

// Public: Get appointments for a visitor (by visitorId)
const getAppointmentsByVisitor = async (req, res) => {
  try {
    const { visitorId } = req.params;
    if (!visitorId) return res.status(400).json({ error: 'visitorId is required' });

    const appointments = await Appointment.find({ visitor: visitorId })
      .populate('visitor', 'name email phone')
      .populate('host', 'name email department')
      .populate('approvedBy', 'name')
      .sort({ appointmentDate: -1, appointmentTime: -1 });

    return res.status(200).json({ appointments });
  } catch (err) {
    console.error('getAppointmentsByVisitor error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Approve appointment
const approveAppointment = async (req, res) => {
  const { id } = req.params;
  console.log(`[Approve] Received request to approve appointment ID: ${id}`);
  console.log(`[Approve] Action performed by user: ${req.user ? req.user.email : 'Unknown'}`);

  try {
    const appointment = await Appointment.findById(id).populate('visitor').populate('host', 'name email phone');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (req.user && req.user.role === 'employee') {
      const hostId = appointment.host?._id?.toString();
      if (!hostId || hostId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: only the assigned host can approve' });
      }
    }

    appointment.status = 'approved';
    appointment.approvedBy = req.user ? req.user._id : undefined;
    appointment.approvalDate = new Date();
    await appointment.save();

    // Track notification success
    let emailSent = false;
    let smsSent = false;

    // Send confirmation email + SMS (best-effort) only if visitor contact exists
    if (appointment.visitor && appointment.visitor.email) {
      console.log(`[Approve] Visitor has email (${appointment.visitor.email}). Preparing to send confirmation.`);
      try {
        // Generate QR code for the appointment details
        console.log(`[Approve] Generating QR code for appointment ${id}...`);
        const qrCodeDataURL = await generateQRCode({
          appointmentId: appointment._id,
          visitorId: appointment.visitor._id,
          hostId: appointment.host._id,
          date: appointment.appointmentDate,
        });
        console.log(`[Approve] ✓ QR Code generated successfully`);
        
        console.log(`[Approve] Sending email to ${appointment.visitor.email}...`);
        await sendAppointmentConfirmation(appointment, appointment.visitor, appointment.host, qrCodeDataURL);
        console.log(`[Approve] ✓ Email sent successfully for appointment ID: ${id}`);
        emailSent = true;
      } catch (e) {
        console.error(`[Approve] ✗ FAILED to send appointment confirmation email for ID: ${id}`);
        console.error(`[Approve] Error details:`, e?.message || e);
        console.error(`[Approve] Error stack:`, e?.stack);
        // Don't throw - continue with SMS and response
      }
    } else {
      console.log(`[Approve] Skipping email for appointment ID: ${id}. Visitor: ${appointment.visitor ? 'exists' : 'MISSING'}, Email: ${appointment.visitor?.email || 'MISSING'}`);
    }

    if (appointment.visitor && appointment.visitor.phone) {
      console.log(`[Approve] Visitor has phone number. Sending SMS...`);
      try {
        await sendAppointmentSMS(appointment.visitor.phone, {
          date: new Date(appointment.appointmentDate).toLocaleDateString(),
          time: appointment.appointmentTime,
          location: appointment.location,
          host: appointment.host?.name || ''
        });
        console.log(`[Approve] ✓ SMS sent successfully for appointment ID: ${id}`);
        smsSent = true;
      } catch (e) {
        console.warn(`[Approve] ✗ Failed to send appointment SMS for ID: ${id}. Error:`, e?.message || e);
      }
    }

    // Only mark as notificationsSent if at least email was sent
    appointment.notificationsSent = emailSent;
    await appointment.save();
    
    console.log(`[Approve] Notification status - Email: ${emailSent ? '✓' : '✗'}, SMS: ${smsSent ? '✓' : '✗'}`);

    // Auto-issue an active pass linked to this appointment if none exists
    try {
      const existingPass = await Pass.findOne({ appointment: appointment._id, status: 'active' });
      if (!existingPass) {
        const base = new Date(appointment.appointmentDate);
        const durationMinutes = Number(appointment.duration) || 60;
        const bufferBeforeMin = 30;
        const bufferAfterMin = 30;
        const validFrom = new Date(base.getTime() - bufferBeforeMin * 60000);
        const validUntil = new Date(base.getTime() + (durationMinutes + bufferAfterMin) * 60000);

        const newPass = new Pass({
          visitor: appointment.visitor ? appointment.visitor._id : undefined,
          appointment: appointment._id,
          issuedBy: req.user ? req.user._id : undefined,
          host: appointment.host ? appointment.host._id : undefined,
          validFrom,
          validUntil,
          status: 'active'
        });

        await newPass.save();
        console.log(`[Approve] Auto-issued pass ${newPass.passNumber} for appointment ${appointment._id}`);
      }
    } catch (e) {
      console.warn(`[Approve] Auto-issue pass skipped due to error:`, e?.message || e);
    }

    return res.status(200).json({
      ...appointment.toObject(),
      _notificationStatus: {
        emailSent,
        smsSent,
        message: emailSent ? 'Appointment approved and email sent with QR code' : 'Appointment approved but email failed to send - check logs'
      }
    });
  } catch (err) {
    console.error(`[Approve] Critical error during approval for ID: ${id}. Error:`, err);
    return res.status(500).json({ error: err.message });
  }
};

// Reject appointment
const rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const appointment = await Appointment.findById(id).populate('visitor').populate('host', 'name email');

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (req.user && req.user.role === 'employee') {
      const hostId = appointment.host?._id?.toString();
      if (!hostId || hostId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: only the assigned host can reject' });
      }
    }

    appointment.status = 'rejected';
    appointment.approvedBy = req.user ? req.user._id : undefined;
    appointment.approvalDate = new Date();
    appointment.rejectionReason = rejectionReason;
    await appointment.save();

    // Send rejection email (best-effort)
    try {
      if (appointment.visitor && appointment.visitor.email) {
        const rejectionEmail = `
          <h2>Appointment Rejected</h2>
          <p>Dear ${appointment.visitor.name},</p>
          <p>Your appointment request for ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime} has been rejected.</p>
          ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
          <p>Please contact ${appointment.host.name} for more information.</p>
        `;
        sendEmail(appointment.visitor.email, 'Appointment Rejected', rejectionEmail);
      }
    } catch (e) {
      console.warn('Failed to send rejection email:', e?.message || e);
    }

    return res.status(200).json(appointment);
  } catch (err) {
    console.error('rejectAppointment error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id).populate('visitor').populate('host', 'name email');

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (req.user && req.user.role === 'employee') {
      const hostId = appointment.host?._id?.toString();
      if (!hostId || hostId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: only the assigned host can cancel' });
      }
    }

    // Visitors can cancel only their own appointments
    if (req.user && req.user.role === 'visitor') {
      const visitorDoc = await Visitor.findOne({ user: req.user._id });
      const apptVisitorId = appointment.visitor?._id?.toString();
      if (!visitorDoc || !apptVisitorId || apptVisitorId !== visitorDoc._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: only the appointment owner can cancel' });
      }
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Send cancellation notification (best-effort)
    try {
      const cancellationEmail = `
        <h2>Appointment Cancelled</h2>
        <p>The appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime} has been cancelled.</p>
      `;
      sendEmail(appointment.visitor.email, 'Appointment Cancelled', cancellationEmail);
      sendEmail(appointment.host.email, 'Appointment Cancelled', cancellationEmail);
    } catch (e) {
      console.warn('Failed to send cancellation emails:', e?.message || e);
    }

    return res.status(200).json(appointment);
  } catch (err) {
    console.error('cancelAppointment error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If updating date/time, validate them
    if (updateData.appointmentDate || updateData.appointmentTime) {
      const dateObj = buildAppointmentDate(updateData.appointmentDate || undefined, updateData.appointmentTime || undefined);
      if (!dateObj) return res.status(400).json({ error: 'Invalid appointment date/time' });
      if (dateObj < new Date()) return res.status(400).json({ error: 'Appointment date cannot be in the past' });
      updateData.appointmentDate = dateObj;
      if (!updateData.appointmentTime) updateData.appointmentTime = dateObj.toTimeString().slice(0,5);
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('visitor').populate('host', 'name email phone');

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    return res.status(200).json(appointment);
  } catch (err) {
    console.error('updateAppointment error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Delete appointment (permanently remove from database)
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id).populate('visitor').populate('host', 'name email');

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Authorization: admin can delete any, employee can delete their own, visitor can delete their own
    if (req.user && req.user.role === 'employee') {
      const hostId = appointment.host?._id?.toString();
      if (!hostId || hostId !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: only the assigned host can delete' });
      }
    }

    // Visitors can delete only their own appointments
    if (req.user && req.user.role === 'visitor') {
      const visitorDoc = await Visitor.findOne({ user: req.user._id });
      const apptVisitorId = appointment.visitor?._id?.toString();
      if (!visitorDoc || !apptVisitorId || apptVisitorId !== visitorDoc._id.toString()) {
        return res.status(403).json({ error: 'Forbidden: only the appointment owner can delete' });
      }
    }

    // Delete the appointment from the database
    await Appointment.findByIdAndDelete(id);

    // Send deletion notification (best-effort)
    try {
      const deletionEmail = `
        <h2>Appointment Deleted</h2>
        <p>The appointment scheduled for ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime} has been deleted.</p>
      `;
      sendEmail(appointment.visitor.email, 'Appointment Deleted', deletionEmail);
      sendEmail(appointment.host.email, 'Appointment Deleted', deletionEmail);
    } catch (e) {
      console.warn('Failed to send deletion emails:', e?.message || e);
    }

    return res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('deleteAppointment error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Get appointment statistics
const getAppointmentStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // For employees, restrict stats to their own hosted appointments
    const hostFilter = (req.user && req.user.role === 'employee')
      ? { host: req.user._id }
      : {};

    const stats = {
      total: await Appointment.countDocuments(hostFilter),
      pending: await Appointment.countDocuments({ ...hostFilter, status: 'pending' }),
      approved: await Appointment.countDocuments({ ...hostFilter, status: 'approved' }),
      rejected: await Appointment.countDocuments({ ...hostFilter, status: 'rejected' }),
      todayAppointments: await Appointment.countDocuments({
        ...hostFilter,
        appointmentDate: { $gte: today, $lt: tomorrow },
        status: 'approved'
      })
    };

    return res.status(200).json(stats);
  } catch (err) {
    console.error('getAppointmentStats error:', err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createAppointment,
  createAppointmentPublic,
  getAllAppointments,
  getAppointment,
  getAppointmentsByVisitor,
  getMyAppointments,
  approveAppointment,
  rejectAppointment,
  cancelAppointment,
  deleteAppointment,
  updateAppointment,
  getAppointmentStats
};
