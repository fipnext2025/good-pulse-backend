const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// OTP-based authentication
router.post(
  '/send-otp',
  [
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
  ],
  validate,
  authController.sendOtp
);

router.post(
  '/verify-otp',
  [
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP is required'),
  ],
  validate,
  authController.verifyOtp
);

// Complete registration (requires auth token from verify-otp)
router.post(
  '/complete-registration',
  auth,
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  ],
  validate,
  authController.completeRegistration
);

// ============================================================
// COMMENTED OUT - Email/Password routes (future use)
// ============================================================

// router.post(
//   '/signup',
//   [
//     body('name').trim().notEmpty().withMessage('Name is required'),
//     body('email').isEmail().withMessage('Valid email is required'),
//     body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
//   ],
//   validate,
//   authController.signup
// );

// router.post(
//   '/login',
//   [
//     body('email').isEmail().withMessage('Valid email is required'),
//     body('password').notEmpty().withMessage('Password is required'),
//   ],
//   validate,
//   authController.login
// );

// ============================================================
// COMMENTED OUT - Social login routes (future use)
// ============================================================

// router.post(
//   '/social',
//   [
//     body('provider').isIn(['google', 'facebook']).withMessage('Invalid provider'),
//     body('token').notEmpty().withMessage('Social token is required'),
//     body('email').isEmail().withMessage('Valid email is required'),
//     body('name').trim().notEmpty().withMessage('Name is required'),
//   ],
//   validate,
//   authController.socialLogin
// );

module.exports = router;
