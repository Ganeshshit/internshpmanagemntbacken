// src/routes/index.js
// Central route aggregator

const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const internshipRoutes = require('./internship.routes');
// const attendanceRoutes = require('./attendance.routes');
// const assignmentRoutes = require('./assignment.routes');
// const quizRoutes = require('./quiz.routes');
// const reportRoutes = require('./report.routes');

const router = express.Router();

// API version
const API_VERSION = process.env.API_VERSION || '/v1';
const version = process.env.VERSION || '1.0.0';

// Health check
router.get(`/${API_VERSION}/health`, (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    version: version,
  });
});

// Mount routes
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/users`, userRoutes);
router.use(`/${API_VERSION}/internships`, internshipRoutes);
// router.use(`${API_VERSION}/attendance`, attendanceRoutes);
// router.use(`${API_VERSION}/assignments`, assignmentRoutes);
// router.use(`${API_VERSION}/quizzes`, quizRoutes);
// router.use(`${API_VERSION}/reports`, reportRoutes);

// 404 for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

module.exports = router;