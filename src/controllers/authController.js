const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to phone number
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const otp = generateOTP();
    console.log(`Generated OTP for ${phone}: ${otp}`); // Log OTP for development/testing

    // Store OTP with 5-minute expiry
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // TODO: Integrate with SMS service (Twilio, MSG91, etc.) to send OTP
    // For now, log OTP to console for development/testing
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    res.json({
      message: 'OTP sent successfully',
      // Remove this in production - only for development testing
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP and login/identify user
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    const storedOtpData = otpStore.get(phone);

    if (!storedOtpData) {
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new OTP.' });
    }

    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP verified - clear it
    otpStore.delete(phone);

    // Check if user exists
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      // Create a new user with just the phone number (not fully registered yet)
      user = await User.create({ phone, isRegistered: false });
      isNewUser = true;
    }

    const token = generateToken(user._id);

    res.json({
      token,
      isNewUser: !user.isRegistered,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        location: user.location,
        isRegistered: user.isRegistered,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Complete registration for new users (add name and email)
exports.completeRegistration = async (req, res, next) => {
  try {
    const { name, email, area, city, district, state, country } = req.body;
    const userId = req.user._id;

    if (!name) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered to another account' });
      }
    }

    user.name = name;
    user.email = email || '';
    if (area) user.location.area = area;
    if (city) user.location.city = city;
    if (district) user.location.district = district;
    if (state) user.location.state = state;
    if (country) user.location.country = country;
    user.isRegistered = true;
    await user.save();

    res.json({
      message: 'Registration completed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        location: user.location,
        isRegistered: user.isRegistered,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// COMMENTED OUT - Email/Password login (future use)
// ============================================================

// exports.signup = async (req, res, next) => {
//   try {
//     const { name, email, password } = req.body;
//
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(409).json({ message: 'Email already registered' });
//     }
//
//     const user = await User.create({ name, email, password });
//     const token = generateToken(user._id);
//
//     res.status(201).json({
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         avatar: user.avatar,
//         createdAt: user.createdAt,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.login = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;
//
//     const user = await User.findOne({ email }).select('+password');
//     if (!user || !user.password) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }
//
//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid email or password' });
//     }
//
//     const token = generateToken(user._id);
//
//     res.json({
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         avatar: user.avatar,
//         createdAt: user.createdAt,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// ============================================================
// COMMENTED OUT - Social login (future use)
// ============================================================

// exports.socialLogin = async (req, res, next) => {
//   try {
//     const { provider, token: socialToken, name, email } = req.body;
//
//     let user = await User.findOne({ email });
//
//     if (!user) {
//       user = await User.create({
//         name,
//         email,
//         socialProvider: provider,
//         socialId: socialToken,
//       });
//     }
//
//     const token = generateToken(user._id);
//
//     res.json({
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         avatar: user.avatar,
//         createdAt: user.createdAt,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };
