const User = require('../models/User');
const jwt = require('jsonwebtoken');

//create jwt token
const createToken = (_id) => {
    return jwt.sign({_id}, process.env.JWT_SECRET, { expiresIn: '3d' });
}


//login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: (user.role || '').toString().toLowerCase(),
            department: user.department,
            token
        });
    } catch (error) {
        console.error(`Login error for ${email}:`, error.message); // Log the specific error
        res.status(400).json({ error: error.message });
    }
}

//signup user
const signupUser = async (req, res) => {
    const { name, email, password, phone, role, department } = req.body;

    try {
        const user = await User.signup(name, email, password, phone, role, department);
        const token = createToken(user._id);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: (user.role || '').toString().toLowerCase(),
            department: user.department,
            token
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

//get current user
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }   
}


//update user profile (also sync Visitor profile for visitor role)
const updateProfile = async (req, res) => {
    try {
        const { name, phone, department, email } = req.body;

        // Load current user first (need current email/role)
        const current = await User.findById(req.user._id);
        if (!current) return res.status(404).json({ error: 'User not found' });

        const updateData = {};
        if (typeof name !== 'undefined') updateData.name = name;
        if (typeof phone !== 'undefined') updateData.phone = phone;
        if (typeof department !== 'undefined') updateData.department = department;

        // Handle optional email change with validation and uniqueness check
        if (typeof email !== 'undefined' && email && email.toLowerCase() !== current.email) {
            const normalizedEmail = email.toString().trim().toLowerCase();
            // basic email validation via regex-lite; deeper validation handled by schema too
            const emailRegex = /.+@.+\..+/;
            if (!emailRegex.test(normalizedEmail)) {
                return res.status(400).json({ error: 'Invalid email address' });
            }
            const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: current._id } });
            if (exists) {
                return res.status(400).json({ error: 'Email already in use' });
            }
            updateData.email = normalizedEmail;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        // If visitor role, keep Visitor collection in sync for name/email/phone
        const role = (updatedUser.role || '').toString().toLowerCase();
        if (role === 'visitor') {
            try {
                const oldEmail = current.email;
                const newEmail = updatedUser.email;
                const Visitor = require('../models/Visitor');
                const v = await Visitor.findOne({ email: oldEmail });
                if (v) {
                    if (typeof name !== 'undefined') v.name = name;
                    if (typeof phone !== 'undefined') v.phone = phone;
                    if (typeof email !== 'undefined') v.email = newEmail;
                    await v.save();
                } else {
                    // Upsert minimal Visitor record if missing
                    await Visitor.create({
                        name: typeof name !== 'undefined' ? name : updatedUser.name,
                        email: typeof email !== 'undefined' ? newEmail : updatedUser.email,
                        phone: typeof phone !== 'undefined' ? phone : updatedUser.phone
                    });
                }
            } catch (syncErr) {
                // Log but do not block profile update
                console.warn('Visitor sync failed:', syncErr?.message || syncErr);
            }
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// Get all users (admin only)

const getAllUsers = async (req, res) => {
  try {
    // ✅ fixed: moved .sort() inside query, not on array
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Public: Get host users (employees only) for appointment selection
const getHosts = async (req, res) => {
    try {
        const hosts = await User.find({ role: 'employee', isActive: true })
            .select('name email department role');
        res.status(200).json({ users: hosts });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

//update user role or active status (admin only)

const updateUserRole = async (req, res) => {
    try {
        const { userId, role, isActive } = req.body;

        const updateData = {};
        if (role) updateData.role = role;
        if(typeof isActive !== 'undefined') updateData.isActive = isActive;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');

        res.status(200).json(user);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}


// delete user (admin only)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
}

// create user (admin only) - for creating employee and security users
const createUser = async (req, res) => {
    const { name, email, password, phone, role, department } = req.body;

    try {
        // Validate role - only allow employee and security creation
        if (role !== 'employee' && role !== 'security') {
            return res.status(400).json({ error: 'Only employee and security roles can be created through this endpoint' });
        }

        const user = await User.signup(name, email, password, phone, role, department);
        
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: (user.role || '').toString().toLowerCase(),
            department: user.department,
            message: 'User created successfully'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

module.exports = {
    loginUser,
    signupUser,
    getProfile,
    updateProfile,
    getAllUsers,
    getHosts,
    updateUserRole,
    deleteUser,
    createUser
}
