const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Public blood availability search endpoint
router.get('/blood-availability', publicController.searchBloodAvailability);

module.exports = router;
