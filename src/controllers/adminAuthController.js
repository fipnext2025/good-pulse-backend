const Admin = require('../models/Admin');
const generateToken = require('../utils/generateToken');

// Admin login with email and password
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(admin._id);

    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current admin profile
exports.getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json({
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Seed default admin (only if no admins exist)
exports.seed = async (req, res, next) => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Admin already exists. Use login instead.' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const admin = await Admin.create({ name, email, password });

    const token = generateToken(admin._id);

    res.status(201).json({
      message: 'Admin account created successfully',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    next(error);
  }
};
