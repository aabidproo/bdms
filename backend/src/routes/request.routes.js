const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const requestController = require('../controllers/request.controller');

// All request routes require RECIPIENT role
router.post('/', authenticate, authorize('RECIPIENT'), requestController.submitRequest);
router.get('/my', authenticate, authorize('RECIPIENT'), requestController.getMyRequests);
router.get('/:requestId/matched-donors', authenticate, authorize('RECIPIENT'), requestController.getMatchedDonors);

module.exports = router;
