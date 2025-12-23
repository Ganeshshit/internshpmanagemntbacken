// src/routes/attendance.routes.js
const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isTrainerOrAdmin, isAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const attendanceValidation = require('../validations/attendance.validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * STUDENT ROUTES
 */

/**
 * @route   GET /api/v1/attendance/my-attendance
 * @desc    Get current student's attendance
 * @access  Private (Student)
 */
router.get(
    '/my-attendance',
    attendanceController.getMyAttendance
);

/**
 * @route   GET /api/v1/attendance/my-monthly-stats
 * @desc    Get current student's monthly stats
 * @access  Private (Student)
 */
router.get(
    '/my-monthly-stats',
    attendanceController.getMyMonthlyStats
);

/**
 * TRAINER/ADMIN ROUTES
 */

/**
 * @route   POST /api/v1/attendance
 * @desc    Mark attendance for a student
 * @access  Private (Trainer, Admin)
 */
router.post(
    '/',
    isTrainerOrAdmin,
    validate(attendanceValidation.markAttendance),
    attendanceController.markAttendance
);

/**
 * @route   POST /api/v1/attendance/bulk
 * @desc    Bulk mark attendance for multiple students
 * @access  Private (Trainer, Admin)
 */
router.post(
    '/bulk',
    isTrainerOrAdmin,
    validate(attendanceValidation.bulkMarkAttendance),
    attendanceController.bulkMarkAttendance
);

/**
 * @route   GET /api/v1/attendance/enrolled-students/:internshipId
 * @desc    Get enrolled students for an internship
 * @access  Private (Trainer, Admin)
 */
router.get(
    '/enrolled-students/:internshipId',
    isTrainerOrAdmin,
    attendanceController.getEnrolledStudents
);

/**
 * @route   GET /api/v1/attendance/monthly-stats/:internshipId/:studentId
 * @desc    Get student monthly attendance statistics
 * @access  Private (Trainer, Admin)
 */
router.get(
    '/monthly-stats/:internshipId/:studentId',
    isTrainerOrAdmin,
    validate(attendanceValidation.getMonthlyStats),
    attendanceController.getMonthlyStats
);

/**
 * @route   GET /api/v1/attendance/monthly-report/:internshipId
 * @desc    Get internship monthly attendance report
 * @access  Private (Trainer, Admin)
 */
router.get(
    '/monthly-report/:internshipId',
    isTrainerOrAdmin,
    validate(attendanceValidation.getMonthlyReport),
    attendanceController.getMonthlyReport
);

/**
 * @route   GET /api/v1/attendance/:id
 * @desc    Get single attendance record
 * @access  Private
 */
router.get(
    '/:id',
    validate(attendanceValidation.getById),
    attendanceController.getAttendanceById
);

/**
 * @route   GET /api/v1/attendance
 * @desc    Get attendance records with filters
 * @access  Private
 */
router.get(
    '/',
    validate(attendanceValidation.getAttendance),
    attendanceController.getAttendance
);

/**
 * @route   PUT /api/v1/attendance/:id
 * @desc    Update attendance record
 * @access  Private (Trainer, Admin)
 */
router.put(
    '/:id',
    isTrainerOrAdmin,
    validate(attendanceValidation.updateAttendance),
    attendanceController.updateAttendance
);

/**
 * @route   DELETE /api/v1/attendance/:id
 * @desc    Delete attendance record
 * @access  Private (Admin only)
 */
router.delete(
    '/:id',
    isAdmin,
    validate(attendanceValidation.deleteAttendance),
    attendanceController.deleteAttendance
);

module.exports = router;