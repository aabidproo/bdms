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

// ─── Inventory Management ───────────────────────────────
app.get('/api/admin/stock', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    console.log('--- FETCHING STOCK ---');
    const { search, sort } = req.query;
    let queryOptions = {};
    
    if (search) {
      queryOptions.where = { bloodGroup: { contains: search } };
    }
    
    let orderBy = { updatedAt: 'desc' };
    if (sort === 'stock_low') orderBy = { units: 'asc' };
    else if (sort === 'stock_high') orderBy = { units: 'desc' };
    queryOptions.orderBy = orderBy;
    
    console.log('Query Options:', JSON.stringify(queryOptions));
    const stock = await prisma.bloodStock.findMany(queryOptions);
    console.log('Stock found:', stock.length);
    res.json({ success: true, data: stock });
  } catch (error) {
    console.error('CRITICAL STOCK FETCH ERROR:', error);
    next(error);
  }
});

app.post('/api/admin/stock', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { bloodGroup, units, expirationDate } = req.body;
    const stock = await prisma.bloodStock.upsert({
      where: { bloodGroup },
      update: { 
        units: { increment: parseInt(units) },
        expirationDate: expirationDate ? new Date(expirationDate) : null
      },
      create: { 
        bloodGroup, 
        units: parseInt(units),
        expirationDate: expirationDate ? new Date(expirationDate) : null
      }
    });
    res.json({ success: true, message: 'Stock added successfully', data: stock });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/stock/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    await prisma.bloodStock.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Stock record deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── Blood Requests ───────────────────────────────────────
app.get('/api/admin/requests', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    console.log('--- FETCHING REQUESTS ---');
    const requests = await prisma.bloodRequest.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Requests found:', requests.length);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('CRITICAL REQUESTS FETCH ERROR:', error);
    next(error);
  }
});

app.put('/api/admin/requests/:id/status', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { status } = req.body; // e.g. APPROVED, REJECTED
    const reqInfo = await prisma.bloodRequest.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json({ success: true, message: `Request marked as ${status}`, data: reqInfo });
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
