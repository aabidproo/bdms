require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const donationRoutes = require('./routes/donation.routes');
const requestRoutes = require('./routes/request.routes');
const publicRoutes = require('./routes/public.routes');
const chatRoutes = require('./routes/chat.routes');
const userRoutes = require('./routes/user.routes');
const notificationRoutes = require('./routes/notification.routes');
const { updateActiveRole, addRole } = require('./controllers/user.controller');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/auth');
const authorize = require('./middleware/authorize');

const prisma = require('./lib/prisma');

const locationRoutes = require('./routes/location.routes');
const bloodRoutes = require('./routes/blood.routes');

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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

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
app.use('/api/public', publicRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/blood', bloodRoutes);
app.get('/api/search', require('./controllers/blood.controller').searchBlood);
app.patch('/api/user/active-role', authenticate, updateActiveRole);
app.post('/api/user/add-role', authenticate, addRole);

// ─── Protected Profile Routes ───────────────────────────
// ─── Protected Donor Eligibility ───────────────────────
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
