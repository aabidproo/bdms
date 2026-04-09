require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/auth');
const authorize = require('./middleware/authorize');
const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ──────────────────────────────────
app.use(cors());
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

// ─── Protected Test Routes ──────────────────────────────
app.get('/api/donor/profile', authenticate, authorize('DONOR'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the Donor profile.', user: req.user });
});

app.get('/api/recipient/profile', authenticate, authorize('RECIPIENT'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the Recipient profile.', user: req.user });
});

app.get('/api/admin/users', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// ─── Centralized Error Handler (must be last) ───────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🩸 LifeLink API Server`);
  console.log(`   → Running on: http://localhost:${PORT}`);
  console.log(`   → Health:     http://localhost:${PORT}/api/health`);
  console.log(`   → Auth:       http://localhost:${PORT}/api/auth\n`);
});
