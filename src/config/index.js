// src/config/index.js
// Configuration aggregator

require('dotenv').config();

const connectDB = require('./db.config');
const authConfig = require('./auth.config');
const corsConfig = require('./cors.config');
const storageConfig = require('./storage.config');

// Initialize database connection
connectDB();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  
  database: {
    uri: process.env.MONGO_URI,
  },
  
  auth: authConfig,
  cors: corsConfig,
  storage: storageConfig,
  
  // Email configuration (if needed)
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};