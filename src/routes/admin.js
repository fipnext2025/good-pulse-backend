const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const adminAuthController = require('../controllers/adminAuthController');
const adminController = require('../controllers/adminController');
const submissionController = require('../controllers/submissionController');
const livestreamController = require('../controllers/livestreamController');

// Public admin routes (no auth required)
router.post('/login', adminAuthController.login);
router.post('/seed', adminAuthController.seed);

// Protected admin routes
router.use(adminAuth);

router.get('/me', adminAuthController.getMe);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Users
router.get('/users', adminController.getUsers);

// Submissions (reuse existing getAll + getById)
router.get('/submissions', submissionController.getAll);
router.get('/submissions/:id', submissionController.getById);
router.put('/submissions/:id/approve', adminController.approveSubmission);
router.put('/submissions/:id/reject', adminController.rejectSubmission);

// Livestreams (reuse existing getAll)
router.get('/livestreams', livestreamController.getAll);
router.put('/livestreams/:id/approve', adminController.approveStream);
router.put('/livestreams/:id/reject', adminController.rejectStream);
router.put('/livestreams/:id/start', adminController.startStream);
router.put('/livestreams/:id/pause', adminController.pauseStream);
router.put('/livestreams/:id/end', adminController.endStream);
router.post('/livestreams/start-admin', adminController.startAdminStream);

module.exports = router;
