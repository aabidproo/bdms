require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const donationRoutes = require('./routes/donation.routes');
const requestRoutes = require('./routes/request.routes');
const chatRoutes = require('./routes/chat.routes');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/auth');
const authorize = require('./middleware/authorize');

const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ──────────────────────────────────
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://127.0.0.1:5050',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://localhost:5501',
  'http://localhost:5050',
  'http://localhost:3000'
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
app.use('/api/chat', chatRoutes);

// ─── Protected Profile Routes ───────────────────────────
app.get('/api/donor/profile', authenticate, authorize('DONOR'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { donorProfile: true }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
});

app.get('/api/donor/eligibility', authenticate, authorize('DONOR'), async (req, res, next) => {
  try {
    const profile = await prisma.donorProfile.findUnique({
      where: { userId: req.user.userId }
    });
    if (!profile) return res.status(404).json({ success: false, message: 'Donor profile not found.' });

    if (!profile.lastDonationDate) {
      return res.json({ success: true, data: { eligible: true, nextEligibleDate: null } });
    }

    const lastDate = new Date(profile.lastDonationDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 60);

    const isEligible = nextDate <= new Date();
    res.json({ 
      success: true, 
      data: { 
        eligible: isEligible, 
        nextEligibleDate: nextDate.toISOString() 
      } 
    });
  } catch (error) { next(error); }
});

app.get('/api/recipient/profile', authenticate, authorize('RECIPIENT'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { recipientProfile: true }
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
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
  console.log(`   → Requests:   http://localhost:${PORT}/api/requests`);
  console.log(`   → Chat AI:    http://localhost:${PORT}/api/chat\n`);
});
