require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const donationRoutes = require('./routes/donation.routes');
const requestRoutes = require('./routes/request.routes');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/auth');
const authorize = require('./middleware/authorize');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ──────────────────────────────────
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:5050',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:5050'
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
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
app.use('/api/donations', donationRoutes);
app.use('/api/requests', requestRoutes);

// ─── Protected Test Routes ──────────────────────────────
app.get('/api/donor/profile', authenticate, authorize('DONOR'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the Donor profile.', user: req.user });
});

app.get('/api/recipient/profile', authenticate, authorize('RECIPIENT'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the Recipient profile.', user: req.user });
});

// ─── Centralized Error Handler (must be last) ───────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🩸 LifeLink API Server`);
  console.log(`   → Running on: http://localhost:${PORT}`);
  console.log(`   → Health:     http://localhost:${PORT}/api/health`);
  console.log(`   → Auth:       http://localhost:${PORT}/api/auth`);
  console.log(`   → Admin:      http://localhost:${PORT}/api/admin`);
  console.log(`   → Donations:  http://localhost:${PORT}/api/donations`);
  console.log(`   → Requests:   http://localhost:${PORT}/api/requests\n`);
});
