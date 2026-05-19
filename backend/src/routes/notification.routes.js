const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notification.controller');

// All notification endpoints are protected by token authentication
router.get('/', authenticate, getNotifications);
router.post('/read', authenticate, markAsRead);
router.post('/read-all', authenticate, markAllAsRead);

module.exports = router;
