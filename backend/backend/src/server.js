require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middleware/errorHandler');

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

// ─── Centralized Error Handler (must be last) ───────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🩸 LifeLink API Server`);
  console.log(`   → Running on: http://localhost:${PORT}`);
  console.log(`   → Health:     http://localhost:${PORT}/api/health`);
  console.log(`   → Auth:       http://localhost:${PORT}/api/auth\n`);
});
