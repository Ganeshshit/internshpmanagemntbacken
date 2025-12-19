// src/services/attendance.service.js
const Attendance = require('../models/attendance.model');
const Internship = require('../models/internship.model');
const Enrollment = require('../models/enrollment.model');
const User = require('../models/user.model');
const { AppError } = require('../middlewares/error.middleware');

class AttendanceService {
    /**
     * Mark attendance for a student
     */
    async markAttendance(data, userId, userRole) {
        const { internshipId, studentId, date, status, remarks, location, ipAddress, device } = data;

        // Validate internship exists
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Check if internship is active
        const today = new Date();
        if (today < internship.startDate || today > internship.endDate) {
            throw new AppError('Cannot mark attendance outside internship duration', 400);
        }

        // Validate student
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            throw new AppError('Student not found', 404);
        }

        // Check enrollment
        const enrollment = await Enrollment.findOne({
            internshipId,
            studentId,
            status: 'active',
        });

        if (!enrollment) {
            throw new AppError('Student not enrolled in this internship', 403);
        }

        // Authorization check
        if (userRole === 'student' && studentId.toString() !== userId.toString()) {
            throw new AppError('Students can only mark their own attendance', 403);
        }

        // Check for duplicate attendance
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            internshipId,
            studentId,
            date: {
                $gte: attendanceDate,
                $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
            },
        });

        if (existingAttendance) {
            throw new AppError('Attendance already marked for this date', 409);
        }

        // Create attendance record
        const attendance = await Attendance.create({
            internshipId,
            studentId,
            date: attendanceDate,
            status,
            checkInTime: new Date(),
            remarks,
            markedBy: userId,
            markedByRole: userRole,
            location: location ? { type: 'Point', coordinates: location } : undefined,
            ipAddress,
            device,
        });

        return attendance.populate([
            { path: 'studentId', select: 'fullName email rollNumber' },
            { path: 'internshipId', select: 'title code' },
            { path: 'markedBy', select: 'fullName role' },
        ]);
    }

    /**
     * Bulk mark attendance for multiple students
     */
    async bulkMarkAttendance(data, userId, userRole) {
        const { internshipId, date, attendanceRecords } = data;

        // Only trainers and admins can bulk mark
        if (!['trainer', 'admin'].includes(userRole)) {
            throw new AppError('Only trainers and admins can bulk mark attendance', 403);
        }

        // Validate internship
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Check trainer ownership
        if (userRole === 'trainer' && internship.createdBy.toString() !== userId.toString()) {
            throw new AppError('You can only mark attendance for your internships', 403);
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const results = {
            success: [],
            failed: [],
        };

        for (const record of attendanceRecords) {
            try {
                // Check if already marked
                const existing = await Attendance.findOne({
                    internshipId,
                    studentId: record.studentId,
                    date: {
                        $gte: attendanceDate,
                        $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
                    },
                });

                if (existing) {
                    results.failed.push({
                        studentId: record.studentId,
                        reason: 'Already marked',
                    });
                    continue;
                }

                // Check enrollment
                const enrollment = await Enrollment.findOne({
                    internshipId,
                    studentId: record.studentId,
                    status: 'active',
                });

                if (!enrollment) {
                    results.failed.push({
                        studentId: record.studentId,
                        reason: 'Not enrolled',
                    });
                    continue;
                }

                // Create attendance
                const attendance = await Attendance.create({
                    internshipId,
                    studentId: record.studentId,
                    date: attendanceDate,
                    status: record.status,
                    checkInTime: new Date(),
                    remarks: record.remarks,
                    markedBy: userId,
                    markedByRole: userRole,
                });

                results.success.push(attendance);
            } catch (error) {
                results.failed.push({
                    studentId: record.studentId,
                    reason: error.message,
                });
            }
        }

        return results;
    }

    /**
     * Get attendance records with filters
     */
    async getAttendance(filters, userId, userRole) {
        const { internshipId, studentId, status, startDate, endDate, page = 1, limit = 50 } = filters;

        const query = {};

        // Build query based on role
        if (userRole === 'student') {
            query.studentId = userId;
        }

        if (internshipId) {
            query.internshipId = internshipId;

            // Trainers can only see their internships
            if (userRole === 'trainer') {
                const internship = await Internship.findById(internshipId);
                if (!internship || internship.createdBy.toString() !== userId.toString()) {
                    throw new AppError('Access denied to this internship', 403);
                }
            }
        }

        if (studentId) {
            // Students can only see their own
            if (userRole === 'student' && studentId.toString() !== userId.toString()) {
                throw new AppError('Cannot view other students attendance', 403);
            }
            query.studentId = studentId;
        }

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            Attendance.find(query)
                .populate('studentId', 'fullName email rollNumber')
                .populate('internshipId', 'title code')
                .populate('markedBy', 'fullName role')
                .populate('approvedBy', 'fullName role')
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Attendance.countDocuments(query),
        ]);

        return {
            records,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get attendance by ID
     */
    async getAttendanceById(attendanceId, userId, userRole) {
        const attendance = await Attendance.findById(attendanceId)
            .populate('studentId', 'fullName email rollNumber')
            .populate('internshipId', 'title code')
            .populate('markedBy', 'fullName role')
            .populate('approvedBy', 'fullName role')
            .populate('editedBy', 'fullName role');

        if (!attendance) {
            throw new AppError('Attendance record not found', 404);
        }

        // Authorization
        if (userRole === 'student' && attendance.studentId._id.toString() !== userId.toString()) {
            throw new AppError('Cannot view other students attendance', 403);
        }

        if (userRole === 'trainer') {
            const internship = await Internship.findById(attendance.internshipId);
            if (internship.createdBy.toString() !== userId.toString()) {
                throw new AppError('Access denied', 403);
            }
        }

        return attendance;
    }

    /**
     * Update attendance
     */
    async updateAttendance(attendanceId, updates, userId, userRole) {
        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) {
            throw new AppError('Attendance record not found', 404);
        }

        // Only trainers and admins can update
        if (!['trainer', 'admin'].includes(userRole)) {
            throw new AppError('Only trainers and admins can update attendance', 403);
        }

        // Trainer authorization
        if (userRole === 'trainer') {
            const internship = await Internship.findById(attendance.internshipId);
            if (internship.createdBy.toString() !== userId.toString()) {
                throw new AppError('Access denied to this internship', 403);
            }
        }

        // Update allowed fields
        const allowedFields = ['status', 'remarks', 'checkInTime', 'checkOutTime'];
        const updateData = {};

        allowedFields.forEach((field) => {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field];
            }
        });

        // Mark as edited
        if (Object.keys(updateData).length > 0) {
            updateData.isEdited = true;
            updateData.editedBy = userId;
            updateData.editedAt = new Date();
            updateData.editReason = updates.editReason || 'Manual correction';
        }

        Object.assign(attendance, updateData);
        await attendance.save();

        return attendance.populate([
            { path: 'studentId', select: 'fullName email rollNumber' },
            { path: 'internshipId', select: 'title code' },
            { path: 'editedBy', select: 'fullName role' },
        ]);
    }

    /**
     * Delete attendance
     */
    async deleteAttendance(attendanceId, userId, userRole) {
        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) {
            throw new AppError('Attendance record not found', 404);
        }

        // Only admins can delete
        if (userRole !== 'admin') {
            throw new AppError('Only admins can delete attendance records', 403);
        }

        await attendance.deleteOne();
        return { message: 'Attendance deleted successfully' };
    }

    /**
     * Check out attendance
     */
    async checkOut(data, userId) {
        const { internshipId, date } = data;

        const attendanceDate = new Date(date || new Date());
        attendanceDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            internshipId,
            studentId: userId,
            date: {
                $gte: attendanceDate,
                $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000),
            },
        });

        if (!attendance) {
            throw new AppError('No check-in found for today', 404);
        }

        if (attendance.checkOutTime) {
            throw new AppError('Already checked out', 400);
        }

        await attendance.checkOut();

        return attendance.populate([
            { path: 'studentId', select: 'fullName email' },
            { path: 'internshipId', select: 'title code' },
        ]);
    }

    /**
     * Get student attendance statistics
     */
    async getStudentStats(internshipId, studentId, userId, userRole) {
        // Authorization
        if (userRole === 'student' && studentId.toString() !== userId.toString()) {
            throw new AppError('Cannot view other students statistics', 403);
        }

        if (userRole === 'trainer') {
            const internship = await Internship.findById(internshipId);
            if (!internship || internship.createdBy.toString() !== userId.toString()) {
                throw new AppError('Access denied to this internship', 403);
            }
        }

        const stats = await Attendance.getAttendanceStats(internshipId, studentId);

        // Get recent attendance
        const recentAttendance = await Attendance.find({
            internshipId,
            studentId,
        })
            .sort({ date: -1 })
            .limit(10)
            .select('date status checkInTime checkOutTime duration')
            .lean();

        return {
            stats,
            recentAttendance,
        };
    }

    /**
     * Get internship attendance report
     */
    async getInternshipReport(internshipId, filters, userId, userRole) {
        // Validate internship
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Authorization
        if (userRole === 'trainer' && internship.createdBy.toString() !== userId.toString()) {
            throw new AppError('Access denied to this internship', 403);
        }

        const { startDate, endDate } = filters;

        const report = await Attendance.getInternshipAttendanceReport(
            internshipId,
            startDate,
            endDate
        );

        // Get overall statistics
        const overallStats = await Attendance.aggregate([
            {
                $match: {
                    internshipId: require('mongoose').Types.ObjectId(internshipId),
                    ...(startDate && { date: { $gte: new Date(startDate) } }),
                    ...(endDate && { date: { $lte: new Date(endDate) } }),
                },
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        return {
            internship: {
                id: internship._id,
                title: internship.title,
                code: internship.code,
            },
            dateRange: {
                startDate: startDate || internship.startDate,
                endDate: endDate || internship.endDate,
            },
            overallStats,
            studentReports: report,
        };
    }

    /**
     * Approve pending attendance
     */
    async approveAttendance(attendanceId, userId, userRole) {
        const attendance = await Attendance.findById(attendanceId);
        if (!attendance) {
            throw new AppError('Attendance record not found', 404);
        }

        // Only trainers and admins
        if (!['trainer', 'admin'].includes(userRole)) {
            throw new AppError('Only trainers and admins can approve attendance', 403);
        }

        // Trainer authorization
        if (userRole === 'trainer') {
            const internship = await Internship.findById(attendance.internshipId);
            if (internship.createdBy.toString() !== userId.toString()) {
                throw new AppError('Access denied to this internship', 403);
            }
        }

        if (attendance.isApproved) {
            throw new AppError('Attendance already approved', 400);
        }

        await attendance.approve(userId);

        return attendance.populate([
            { path: 'studentId', select: 'fullName email' },
            { path: 'approvedBy', select: 'fullName role' },
        ]);
    }

    /**
     * Get pending approvals
     */
    async getPendingApprovals(filters, userId, userRole) {
        const { internshipId, page = 1, limit = 50 } = filters;

        const query = { isApproved: false };

        if (internshipId) {
            query.internshipId = internshipId;
        }

        // Trainers only see their internships
        if (userRole === 'trainer') {
            const internships = await Internship.find({ createdBy: userId }).select('_id');
            const internshipIds = internships.map((i) => i._id);
            query.internshipId = { $in: internshipIds };
        }

        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            Attendance.find(query)
                .populate('studentId', 'fullName email rollNumber')
                .populate('internshipId', 'title code')
                .populate('markedBy', 'fullName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Attendance.countDocuments(query),
        ]);

        return {
            records,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
}

module.exports = new AttendanceService();