const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  registerToken,
  removeToken,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  updatePreferences,
  getPreferences,
} = require('../controllers/notificationController');

// All routes require authentication
router.use(auth);

// Push token management
router.post('/register-token', registerToken);
router.post('/remove-token', removeToken);

// Notifications
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);

// Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

module.exports = router;
