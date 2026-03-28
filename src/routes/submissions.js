const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const { imageUpload } = require('../config/s3');
const multer = require('multer');
const submissionController = require('../controllers/submissionController');

const router = express.Router();

// Multi-field upload: accepts multiple images + one video
const submissionUpload = multer({
  storage: imageUpload.storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for video
}).fields([
  { name: 'images', maxCount: 5 },
  { name: 'image', maxCount: 1 }, // backward compat
  { name: 'video', maxCount: 1 },
]);

router.post(
  '/',
  auth,
  submissionUpload,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }),
    body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 500 }),
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required'),
  ],
  validate,
  submissionController.create
);

router.get('/', auth, submissionController.getAll);

// Recent community deeds (approved submissions)
router.get('/recent', auth, submissionController.getRecentDeeds);

// Recent addressed issues (approved)
router.get('/issues', auth, submissionController.getRecentIssues);

// Get deeds for a specific issue
router.get('/:id/deeds', auth, submissionController.getDeedsByIssue);

// Deed an addressed issue (upload proof)
router.post('/:id/deed', auth, submissionUpload, submissionController.deedIssue);

// User public profile (karma, deeds, addressed issues)
router.get('/user/:userId/public-profile', auth, submissionController.getUserPublicProfile);

router.get('/:id', auth, submissionController.getById);

router.get('/user/:userId', auth, submissionController.getUserSubmissions);

module.exports = router;
