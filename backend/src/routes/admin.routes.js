const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// All routes here require ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/summary', adminController.getSummary);
router.get('/users', adminController.getUsers);
router.get('/stock', adminController.getStock);
router.post('/stock', adminController.addStock);
router.put('/stock/:id', adminController.updateStock);
router.delete('/stock/:id', adminController.deleteStock);
router.get('/requests', adminController.getRequests);
router.put('/requests/:id/status', adminController.updateRequestStatus);

module.exports = router;
