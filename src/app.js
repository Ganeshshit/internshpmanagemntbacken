// src/app.js
// Express application configuration

const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const routes = require('./routes');
const { errorMiddleware } = require('./middlewares/error.middleware');
const requestLogger = require('./middlewares/requestLogger.middleware');

const app = express();

/**
 * 🔴 REQUIRED FOR RENDER / PROXY (CRITICAL)
 * Without this, secure cookies will FAIL
 */
app.set('trust proxy', 1);

/**
 * Request logger (first)
 */
app.use(requestLogger);

/**
 * Parse cookies BEFORE routes
 */
app.use(cookieParser());

/**
 * Security middlewares
 */
app.use(helmet());
app.use(mongoSanitize());

/**
 * CORS (credentials enabled)
 */
app.use(cors(config.cors));

/**
 * Handle preflight requests
 */
app.options('*', cors(config.cors));

/**
 * Body parsing
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Compression
 */
app.use(compression());

/**
 * API routes
 */
app.use('/api', routes);

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/**
 * Global error handler
 */
app.use(errorMiddleware);

module.exports = app;
