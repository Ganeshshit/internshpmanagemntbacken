// src/app.js
// Express application configuration

const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { errorMiddleware } = require('./middlewares/error.middleware');
const requestLogger = require('./middlewares/requestLogger.middleware');

const coockieParser = require('cookie-parser');
const app = express();
app.use(requestLogger)
app.use(coockieParser());
// Security middlewares
app.use(helmet());
app.use(mongoSanitize());

// CORS
app.use(cors(config.cors));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Health check
// app.get('/health', (req, res) => {
//   res.status(200).json({ 
//     status: 'OK', 
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime()
//   });
// });

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorMiddleware);

module.exports = app;