const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');

// All routes here require authentication
router.use(auth);

// GET /api/users/profile - Get current user profile
router.get('/profile', userController.getProfile);

// PUT /api/users/profile - Update current user profile
router.put('/profile', userController.updateProfile);

// PUT /api/users/password - Update password
router.put('/password', userController.updatePassword);

// PATCH /api/users/active-role - Switch active role
router.patch('/active-role', userController.updateActiveRole);

module.exports = router;
