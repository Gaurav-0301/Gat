const Visitor = require('../models/Visitor');
const path = require('path');
const fs = require('fs');

// Register a new visitor
const registerVisitor = async (req, res) => {
  try {
    const { name, email, phone, company, idType, idNumber, address, purpose, vehicleNumber } = req.body;

    // Resolve User by email or logged-in user
    const userId = req.user?._id;
    const user = userId ? userId : null;
    if (!user && !email) {
      return res.status(400).json({ error: 'User context or email is required to link visitor' });
    }

    // If visitor already exists for this user, block duplicate
    if (user) {
      const existingByUser = await Visitor.findOne({ user });
      if (existingByUser) return res.status(200).json(existingByUser);
    }

    // If existing visitor by email with user, return it
    const existingByEmail = await Visitor.findOne({ email });
    if (existingByEmail) return res.status(200).json(existingByEmail);

    // Check if photo was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    const visitor = await Visitor.create({
      user: user || (req.body.userId ? req.body.userId : undefined),
      name,
      email,
      phone,
      company,
      idType,
      idNumber,
      address,
      purpose,
      vehicleNumber,
      photo: req.file?.secure_url || req.file?.path || null,
      visitCount: 1,
      lastVisit: new Date()
    });

    res.status(201).json(visitor);
  } catch (error) {
    console.error('Error registering visitor:', error);
    res.status(400).json({ error: error.message });
  }
};

// Public registration (used for pre-registration by visitors)
const registerVisitorPublic = async (req, res) => {
  try {
    const { name, email, phone, company, idType, idNumber, address, purpose, vehicleNumber } = req.body;

    // Photo is required for registration
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    // Must map to existing user by email to satisfy visitor.user link
    const userDoc = await require('../models/User').findOne({ email });
    if (!userDoc) {
      return res.status(400).json({ error: 'User account not found for this email. Please sign up first.' });
    }

    // Check if visitor already exists
    let visitor = await Visitor.findOne({ user: userDoc._id });

    if (visitor) {
      // Do not require authentication: update some fields but do not change role
      visitor.name = name || visitor.name;
      visitor.phone = phone || visitor.phone;
      visitor.company = company || visitor.company;
      visitor.idType = idType || visitor.idType;
      visitor.idNumber = idNumber || visitor.idNumber;
      visitor.address = address || visitor.address;
      visitor.purpose = purpose || visitor.purpose;
      visitor.vehicleNumber = vehicleNumber || visitor.vehicleNumber;
      visitor.visitCount = (visitor.visitCount || 0) + 1;
      visitor.lastVisit = new Date();

      // Replace photo
      if (req.file) {
        const photoPath = req.file?.secure_url || req.file?.path || null;
        visitor.photo = photoPath;
        visitor.user = userDoc._id;
      }

      await visitor.save();
    } else {
      // Create new visitor record
      visitor = await Visitor.create({
        user: userDoc._id,
        name,
        email,
        phone,
        company,
        idType,
        idNumber,
        address,
        purpose,
        vehicleNumber,
        photo: req.file?.secure_url || req.file?.path || null,
        visitCount: 1,
        lastVisit: new Date()
      });
    }

    res.status(201).json(visitor);
  } catch (error) {
    console.error('Error in public registration:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get all visitors
const getAllVisitors = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const visitors = await Visitor.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Visitor.countDocuments(query);

    res.status(200).json({
      visitors,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalVisitors: count
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get single visitor
const getVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id);

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    res.status(200).json(visitor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update visitor
const updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If new photo uploaded
    if (req.file) {
      const visitor = await Visitor.findById(id);
      
      // Delete old photo
      if (visitor.photo && fs.existsSync(path.join(__dirname, '..', visitor.photo))) {
        fs.unlinkSync(path.join(__dirname, '..', visitor.photo));
      }
      
      updateData.photo = req.file.path;
    }

     const updatedVisitor = await Visitor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    res.status(200).json(updatedVisitor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Blacklist/Unblacklist visitor
const toggleBlacklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlacklisted, blacklistReason } = req.body;

    const visitor = await Visitor.findByIdAndUpdate(
      id,
      { isBlacklisted, blacklistReason },
      { new: true }
    );

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    res.status(200).json(visitor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete visitor
const deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.findById(id);

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Delete photo file
    if (visitor.photo && fs.existsSync(path.join(__dirname, '..', visitor.photo))) {
      fs.unlinkSync(path.join(__dirname, '..', visitor.photo));
    }

    await Visitor.findByIdAndDelete(id);
    res.status(200).json({ message: 'Visitor deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get visitor statistics
const getVisitorStats = async (req, res) => {
  try {
    const totalVisitors = await Visitor.countDocuments();
    const blacklistedVisitors = await Visitor.countDocuments({ isBlacklisted: true });
    const frequentVisitors = await Visitor.find().sort({ visitCount: -1 }).limit(10);

    res.status(200).json({
      totalVisitors,
      blacklistedVisitors,
      frequentVisitors
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  registerVisitor,
  registerVisitorPublic,
  getAllVisitors,
  getVisitor,
  updateVisitor,
  toggleBlacklist,
  deleteVisitor,
  getVisitorStats
};