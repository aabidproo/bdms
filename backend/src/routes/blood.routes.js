const express = require('express');
const router = express.Router();
const bloodController = require('../controllers/blood.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/search', bloodController.searchBlood);
router.put('/inventory/:hospitalId', authenticate, authorize('ADMIN'), bloodController.updateInventory);

module.exports = router;
