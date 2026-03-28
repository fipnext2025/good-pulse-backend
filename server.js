require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth');
const submissionRoutes = require('./src/routes/submissions');
const mapRoutes = require('./src/routes/map');
const leaderboardRoutes = require('./src/routes/leaderboard');
const profileRoutes = require('./src/routes/profile');
const videoRoutes = require('./src/routes/videos');
const livestreamRoutes = require('./src/routes/livestreams');
const adminRoutes = require('./src/routes/admin');
const notificationRoutes = require('./src/routes/notifications');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/livestreams', livestreamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`GoodPulse API Server running on port ${PORT}`);
});

module.exports = app;
