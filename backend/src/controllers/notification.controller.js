const prisma = require('../lib/prisma');

// ─── Utility Helper to Create Notifications ─────────────
const createNotification = async (userId, title, message, type = 'info') => {
  try {
    return await prisma.notification.create({
      data: {
        userId: userId || null,
        title,
        message,
        type
      }
    });
  } catch (error) {
    console.error('Failed to create notification record:', error);
  }
};

// ─── GET /api/notifications ─────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    // If Admin, fetch both user-specific and system-wide/null notifications.
    // Otherwise, fetch target user's notifications only.
    const whereClause = req.user.role === 'ADMIN'
      ? { OR: [{ userId: req.user.userId }, { userId: null }] }
      : { userId: req.user.userId };

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 notifications for sanity
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/notifications/read ───────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing notification IDs.' });
    }

    const whereClause = req.user.role === 'ADMIN'
      ? { id: { in: notificationIds } }
      : { id: { in: notificationIds }, userId: req.user.userId };

    await prisma.notification.updateMany({
      where: whereClause,
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Notifications marked as read successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/notifications/read-all ───────────────────
const markAllAsRead = async (req, res, next) => {
  try {
    const whereClause = req.user.role === 'ADMIN'
      ? { OR: [{ userId: req.user.userId }, { userId: null }] }
      : { userId: req.user.userId };

    await prisma.notification.updateMany({
      where: {
        ...whereClause,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead
};
