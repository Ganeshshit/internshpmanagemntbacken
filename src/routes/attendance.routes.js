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
 * @route   POST /api/v1/attendance
 * @desc    Mark attendance (Students mark their own, Trainers/Admins can mark for anyone)
 * @access  Private
 */
router.post(
    '/',
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
 * @route   POST /api/v1/attendance/checkout
 * @desc    Check out from attendance
 * @access  Private (Student)
 */
router.post(
    '/checkout',
    validate(attendanceValidation.checkOut),
    attendanceController.checkOut
);

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
 * @route   GET /api/v1/attendance/today
 * @desc    Check if attendance is marked for today
 * @access  Private (Student)
 */
router.get(
    '/today',
    attendanceController.checkTodayAttendance
);

/**
 * @route   GET /api/v1/attendance/pending
 * @desc    Get pending attendance approvals
 * @access  Private (Trainer, Admin)
 */
router.get(
    '/pending',
    isTrainerOrAdmin,
    attendanceController.getPendingApprovals
);

/**
 * @route   GET /api/v1/attendance/stats/:internshipId/:studentId
 * @desc    Get student attendance statistics
 * @access  Private
 */
router.get(
    '/stats/:internshipId/:studentId',
    validate(attendanceValidation.getStats),
    attendanceController.getStudentStats
);

/**
 * @route   GET /api/v1/attendance/report/:internshipId
 * @desc    Get internship attendance report
 * @access  Private (Trainer, Admin)
 */
router.get(
    '/report/:internshipId',
    isTrainerOrAdmin,
    validate(attendanceValidation.getReport),
    attendanceController.getInternshipReport
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
 * @route   PUT /api/v1/attendance/:id/approve
 * @desc    Approve pending attendance
 * @access  Private (Trainer, Admin)
 */
router.put(
    '/:id/approve',
    isTrainerOrAdmin,
    validate(attendanceValidation.approveAttendance),
    attendanceController.approveAttendance
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