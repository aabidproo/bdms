const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donor.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Requires DONOR role
router.use(authenticate, authorize('DONOR'));

router.get('/profile', donorController.getProfile);
router.get('/eligibility', donorController.checkEligibility);

module.exports = router;
