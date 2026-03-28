const express = require('express');
const auth = require('../middleware/auth');
const { imageUpload } = require('../config/s3');
const multer = require('multer');
const profileController = require('../controllers/profileController');

const router = express.Router();

// Avatar upload middleware
const avatarUpload = multer({
  storage: imageUpload.storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('avatar');

router.get('/:userId', auth, profileController.getProfile);
router.put('/:userId', auth, profileController.updateProfile);
router.get('/:userId/stats', auth, profileController.getStats);

// Upload avatar
router.post('/:userId/avatar', auth, avatarUpload, profileController.uploadAvatar);

module.exports = router;
