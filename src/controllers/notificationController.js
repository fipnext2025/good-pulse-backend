const Notification = require('../models/Notification');
const User = require('../models/User');

// Register push token
exports.registerToken = async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove existing entry for this token (avoid duplicates)
    user.pushTokens = user.pushTokens.filter(t => t.token !== token);

    // Add the new token
    user.pushTokens.push({ token, platform: platform || 'android' });

    // Keep only last 5 tokens per user
    if (user.pushTokens.length > 5) {
      user.pushTokens = user.pushTokens.slice(-5);
    }

    await user.save();
    res.json({ message: 'Push token registered' });
  } catch (error) {
    next(error);
  }
};

// Remove push token (on logout)
exports.removeToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { pushTokens: { token } },
    });

    res.json({ message: 'Push token removed' });
  } catch (error) {
    next(error);
  }
};

// Get user notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments({ userId: req.user.id }),
      Notification.countDocuments({ userId: req.user.id, isRead: false }),
    ]);

    res.json({
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ data: { unreadCount: count } });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// Update notification preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const { pushEnabled, submissionUpdates, streamAlerts, communityUpdates } = req.body;

    const update = {};
    if (pushEnabled !== undefined) update['notificationPreferences.pushEnabled'] = pushEnabled;
    if (submissionUpdates !== undefined) update['notificationPreferences.submissionUpdates'] = submissionUpdates;
    if (streamAlerts !== undefined) update['notificationPreferences.streamAlerts'] = streamAlerts;
    if (communityUpdates !== undefined) update['notificationPreferences.communityUpdates'] = communityUpdates;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ data: user.notificationPreferences });
  } catch (error) {
    next(error);
  }
};

// Get notification preferences
exports.getPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    res.json({ data: user.notificationPreferences });
  } catch (error) {
    next(error);
  }
};
