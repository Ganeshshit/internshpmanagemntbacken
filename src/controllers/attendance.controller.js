// src/controllers/attendance.controller.js
const attendanceService = require('../services/attendance.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler } = require('../middlewares/error.middleware');

class AttendanceController {
    /**
     * @route   POST /api/v1/attendance
     * @desc    Mark attendance for a student (Trainer/Admin only)
     * @access  Private (Trainer, Admin)
     */
    markAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const data = {
            ...req.body,
            ipAddress: req.ip,
            device: req.headers['user-agent'],
        };

        const attendance = await attendanceService.markAttendance(data, userId, role);

        return ApiResponse.success(
            res,
            attendance,
            'Attendance marked successfully',
            201
        );
    });

    /**
     * @route   POST /api/v1/attendance/bulk
     * @desc    Bulk mark attendance for multiple students
     * @access  Private (Trainer, Admin)
     */
    bulkMarkAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const results = await attendanceService.bulkMarkAttendance(req.body, userId, role);

        return ApiResponse.success(
            res,
            results,
            'Bulk attendance marked successfully',
            201
        );
    });

    /**
     * @route   GET /api/v1/attendance
     * @desc    Get attendance records with filters
     * @access  Private
     */
    getAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const filters = {
            internshipId: req.query.internshipId,
            studentId: req.query.studentId,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            month: req.query.month,
            year: req.query.year,
            page: req.query.page,
            limit: req.query.limit,
        };

        const result = await attendanceService.getAttendance(filters, userId, role);

        return ApiResponse.success(
            res,
            result,
            'Attendance records retrieved successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/:id
     * @desc    Get single attendance record by ID
     * @access  Private
     */
    getAttendanceById = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const attendance = await attendanceService.getAttendanceById(
            req.params.id,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            attendance,
            'Attendance record retrieved successfully'
        );
    });

    /**
     * @route   PUT /api/v1/attendance/:id
     * @desc    Update attendance record
     * @access  Private (Trainer, Admin)
     */
    updateAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const attendance = await attendanceService.updateAttendance(
            req.params.id,
            req.body,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            attendance,
            'Attendance updated successfully'
        );
    });

    /**
     * @route   DELETE /api/v1/attendance/:id
     * @desc    Delete attendance record
     * @access  Private (Admin only)
     */
    deleteAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const result = await attendanceService.deleteAttendance(
            req.params.id,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            result,
            'Attendance deleted successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/monthly-stats/:internshipId/:studentId
     * @desc    Get student monthly attendance statistics
     * @access  Private
     */
    getMonthlyStats = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const { internshipId, studentId } = req.params;
        const { month, year } = req.query;

        const stats = await attendanceService.getMonthlyStats(
            internshipId,
            studentId,
            month,
            year,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            stats,
            'Monthly statistics retrieved successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/monthly-report/:internshipId
     * @desc    Get internship monthly attendance report
     * @access  Private (Trainer, Admin)
     */
    getMonthlyReport = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const { month, year } = req.query;

        const report = await attendanceService.getInternshipMonthlyReport(
            req.params.internshipId,
            month,
            year,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            report,
            'Monthly report generated successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/enrolled-students/:internshipId
     * @desc    Get enrolled students for an internship
     * @access  Private (Trainer, Admin)
     */
    getEnrolledStudents = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;

        const students = await attendanceService.getEnrolledStudents(
            req.params.internshipId,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            students,
            'Enrolled students retrieved successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/my-attendance
     * @desc    Get current student's attendance
     * @access  Private (Student)
     */
    getMyAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;

        if (role !== 'student') {
            return ApiResponse.error(res, 'This endpoint is only for students', 403);
        }

        const filters = {
            studentId: userId,
            internshipId: req.query.internshipId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            month: req.query.month,
            year: req.query.year,
            status: req.query.status,
            page: req.query.page,
            limit: req.query.limit,
        };

        const result = await attendanceService.getAttendance(filters, userId, role);

        return ApiResponse.success(
            res,
            result,
            'Your attendance records retrieved successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/my-monthly-stats
     * @desc    Get current student's monthly stats
     * @access  Private (Student)
     */
    getMyMonthlyStats = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;

        if (role !== 'student') {
            return ApiResponse.error(res, 'This endpoint is only for students', 403);
        }

        const { internshipId, month, year } = req.query;

        if (!internshipId || !month || !year) {
            return ApiResponse.error(
                res,
                'Internship ID, month, and year are required',
                400
            );
        }

        const stats = await attendanceService.getMonthlyStats(
            internshipId,
            userId,
            month,
            year,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            stats,
            'Your monthly statistics retrieved successfully'
        );
    });
}

module.exports = new AttendanceController();