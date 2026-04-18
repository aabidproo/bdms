const express = require('express');
const router = express.Router();
const recipientController = require('../controllers/recipient.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Requires RECIPIENT role
router.use(authenticate, authorize('RECIPIENT'));

router.get('/profile', recipientController.getProfile);
router.post('/request', recipientController.submitRequest);
router.get('/requests', recipientController.getRequests);

module.exports = router;
