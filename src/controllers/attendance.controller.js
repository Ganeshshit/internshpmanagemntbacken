// src/controllers/attendance.controller.js
const attendanceService = require('../services/attendance.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler } = require('../middlewares/error.middleware');

class AttendanceController {
    /**
     * @route   POST /api/v1/attendance
     * @desc    Mark attendance for a student
     * @access  Private (Student, Trainer, Admin)
     */
    markAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const data = {
            ...req.body,
            ipAddress: req.ip,
            device: req.headers['user-agent'],
        };

        // If student is marking, use their own ID
        if (role === 'student') {
            data.studentId = userId;
        }

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
     * @route   POST /api/v1/attendance/checkout
     * @desc    Check out from attendance
     * @access  Private (Student)
     */
    checkOut = asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const attendance = await attendanceService.checkOut(req.body, userId);

        return ApiResponse.success(
            res,
            attendance,
            'Checked out successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/stats/:internshipId/:studentId
     * @desc    Get student attendance statistics
     * @access  Private
     */
    getStudentStats = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const { internshipId, studentId } = req.params;

        const stats = await attendanceService.getStudentStats(
            internshipId,
            studentId,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            stats,
            'Student statistics retrieved successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/report/:internshipId
     * @desc    Get internship attendance report
     * @access  Private (Trainer, Admin)
     */
    getInternshipReport = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        };

        const report = await attendanceService.getInternshipReport(
            req.params.internshipId,
            filters,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            report,
            'Internship report generated successfully'
        );
    });

    /**
     * @route   PUT /api/v1/attendance/:id/approve
     * @desc    Approve pending attendance
     * @access  Private (Trainer, Admin)
     */
    approveAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const attendance = await attendanceService.approveAttendance(
            req.params.id,
            userId,
            role
        );

        return ApiResponse.success(
            res,
            attendance,
            'Attendance approved successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/pending
     * @desc    Get pending attendance approvals
     * @access  Private (Trainer, Admin)
     */
    getPendingApprovals = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;
        const filters = {
            internshipId: req.query.internshipId,
            page: req.query.page,
            limit: req.query.limit,
        };

        const result = await attendanceService.getPendingApprovals(filters, userId, role);

        return ApiResponse.success(
            res,
            result,
            'Pending approvals retrieved successfully'
        );
    });

    /**
     * @route   GET /api/v1/attendance/my-attendance
     * @desc    Get current student's attendance across all internships
     * @access  Private (Student)
     */
    getMyAttendance = asyncHandler(async (req, res) => {
        const { userId, role } = req.user;

        if (role !== 'student') {
            return ApiResponse.error(res, 'This endpoint is only for students', 403);
        }

        const filters = {
            studentId: userId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
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
     * @route   GET /api/v1/attendance/today
     * @desc    Check if attendance is marked for today
     * @access  Private (Student)
     */
    checkTodayAttendance = asyncHandler(async (req, res) => {
        const { userId } = req.user;
        const { internshipId } = req.query;

        if (!internshipId) {
            return ApiResponse.error(res, 'Internship ID is required', 400);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await attendanceService.getAttendance(
            {
                internshipId,
                studentId: userId,
                startDate: today,
                endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            },
            userId,
            'student'
        );

        const isMarked = attendance.records.length > 0;
        const record = isMarked ? attendance.records[0] : null;

        return ApiResponse.success(
            res,
            {
                isMarked,
                record,
            },
            isMarked ? 'Attendance already marked for today' : 'No attendance marked for today'
        );
    });
}

module.exports = new AttendanceController();