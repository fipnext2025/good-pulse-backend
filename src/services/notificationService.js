const { admin, firebaseInitialized } = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Send push notification to a user and store in database
 */
async function sendToUser(userId, { title, body, type = 'general', data = {} }) {
  try {
    // Store notification in database
    const notification = await Notification.create({
      userId,
      title,
      body,
      type,
      data,
    });

    // Get user's push tokens
    const user = await User.findById(userId).select('pushTokens notificationPreferences');
    if (!user) return notification;

    // Check user preferences
    if (!user.notificationPreferences?.pushEnabled) return notification;
    if (type.startsWith('submission_') && !user.notificationPreferences?.submissionUpdates) return notification;
    if (type.startsWith('stream_') && !user.notificationPreferences?.streamAlerts) return notification;

    const tokens = user.pushTokens?.map(t => t.token).filter(Boolean);
    if (!tokens || tokens.length === 0) return notification;

    // Send via FCM if initialized
    if (firebaseInitialized()) {
      const message = {
        notification: { title, body },
        data: {
          type,
          notificationId: notification._id.toString(),
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        },
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await User.findByIdAndUpdate(userId, {
            $pull: { pushTokens: { token: { $in: invalidTokens } } },
          });
        }
      }

      console.log(`FCM sent to ${userId}: ${response.successCount} success, ${response.failureCount} failed`);
    } else {
      console.log(`[FCM not configured] Notification stored for ${userId}: ${title}`);
    }

    return notification;
  } catch (error) {
    console.error('Notification send error:', error);
    // Still try to store the notification even if push fails
    try {
      return await Notification.create({ userId, title, body, type, data });
    } catch (dbError) {
      console.error('Failed to store notification:', dbError);
    }
  }
}

/**
 * Send push notification to multiple users
 */
async function sendToMany(userIds, { title, body, type = 'general', data = {} }) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendToUser(userId, { title, body, type, data }))
  );
  return results;
}

module.exports = { sendToUser, sendToMany };
