const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const donationController = require('../controllers/donation.controller');

// All donation routes require DONOR role
router.post('/', authenticate, authorize('DONOR'), donationController.scheduleDonation);
router.get('/my', authenticate, authorize('DONOR'), donationController.getMyDonations);
router.get('/matched-requests', authenticate, authorize('DONOR'), donationController.getMatchedRequests);

module.exports = router;
