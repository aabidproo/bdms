const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const adminController = require('../controllers/admin.controller');

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

// Users
router.get('/users', adminController.getUsers);

// Stats
router.get('/stats', adminController.getStats);

// Inventory Summary (KPI Cards)
router.get('/inventory/summary', adminController.getInventorySummary);

// Stock / Inventory
router.get('/stock', adminController.getStock);
router.post('/stock', adminController.addStock);
router.put('/stock/:id', adminController.updateStock);
router.delete('/stock/:id', adminController.deleteStock);

// Batch detail by blood group (eye icon modal)
router.get('/stock/:bloodGroup/batches', adminController.getBatchesByGroup);

// Dispatch batch to hospital
router.post('/stock/:id/dispatch', adminController.dispatchBatch);

// Hospitals
router.get('/hospitals', adminController.getHospitals);

// Alerts
router.post('/alerts/batch/:id', adminController.createAlert);

// Blood Requests
router.get('/requests', adminController.getRequests);
router.put('/requests/:id/status', adminController.updateRequestStatus);

// Donations
router.get('/donations', adminController.getDonations);
router.put('/donations/:id/status', adminController.updateDonationStatus);

module.exports = router;
