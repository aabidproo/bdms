require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const donorRoutes = require('./routes/donor.routes');
const recipientRoutes = require('./routes/recipient.routes');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/auth');
const authorize = require('./middleware/authorize');
const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ──────────────────────────────────
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'LifeLink API is running 🩸',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/recipient', recipientRoutes);

// ─── Centralized Error Handler (must be last) ───────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🩸 LifeLink API Server`);
  console.log(`   → Running on: http://localhost:${PORT}`);
  console.log(`   → Health:     http://localhost:${PORT}/api/health`);
  console.log(`   → Auth:       http://localhost:${PORT}/api/auth\n`);
});
