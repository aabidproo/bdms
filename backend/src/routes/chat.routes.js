const express = require('express');
const router = express.Router();
const { chatWithGemini } = require('../controllers/chat.controller');

// POST /api/chat
router.post('/', chatWithGemini);

module.exports = router;
