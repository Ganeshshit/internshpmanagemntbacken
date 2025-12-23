// src/services/attendance.service.js
const Attendance = require('../models/attendance.model');
const Internship = require('../models/internship.model');
const Enrollment = require('../models/enrollment.model');
const User = require('../models/user.model');
const { AppError } = require('../middlewares/error.middleware');
const mongoose = require('mongoose');

class AttendanceService {
    /**
     * Mark attendance (Trainer/Admin only)
     */
    async markAttendance(data, userId, userRole) {
        const {
            internshipId,
            studentId,
            date,
            status,
            remarks,
            checkInTime,
            checkOutTime,
            location,
            ipAddress,
            device,
        } = data;

        // Only trainers and admins can mark attendance
        if (!['trainer', 'admin'].includes(userRole)) {
            throw new AppError('Only trainers and admins can mark attendance', 403);
        }

        // Validate internship exists
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Check trainer ownership - FIXED
        if (userRole === 'trainer') {
            if (!internship.trainerId) {
                throw new AppError('Internship trainer is not defined. Contact admin.', 403);
            }

            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('You can only mark attendance for your internships', 403);
            }
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

        // Parse check-in and check-out times
        let checkIn = null;
        let checkOut = null;

        if (checkInTime) {
            const [inHour, inMinute] = checkInTime.split(':').map(Number);
            checkIn = new Date(attendanceDate);
            checkIn.setHours(inHour, inMinute, 0, 0);
        }

        if (checkOutTime) {
            const [outHour, outMinute] = checkOutTime.split(':').map(Number);
            checkOut = new Date(attendanceDate);
            checkOut.setHours(outHour, outMinute, 0, 0);
        }

        // Validate location data
        let locationData = undefined;
        if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
            locationData = {
                type: 'Point',
                coordinates: location.coordinates,
            };
        }

        // Create attendance record
        const attendance = await Attendance.create({
            internshipId,
            studentId,
            date: attendanceDate,
            month: attendanceDate.getMonth() + 1,
            year: attendanceDate.getFullYear(),
            status,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            remarks: remarks || '',
            location: locationData,
            ipAddress: ipAddress || null,
            device: device || null,
            markedBy: userId,
            markedByRole: userRole,
        });

        return attendance.populate([
            { path: 'studentId', select: 'name email rollNumber' },
            { path: 'internshipId', select: 'title code' },
            { path: 'markedBy', select: 'name role' },
        ]);
    }

    /**
     * Bulk mark attendance for multiple students - FIXED
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

        // Check trainer ownership - FIXED
        if (userRole === 'trainer') {
            if (!internship.trainerId) {
                throw new AppError('Internship trainer is not defined. Contact admin.', 403);
            }

            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('You can only mark attendance for your internships', 403);
            }
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
                    month: attendanceDate.getMonth() + 1,
                    year: attendanceDate.getFullYear(),
                    status: record.status,
                    checkInTime: record.checkInTime ? new Date(record.checkInTime) : new Date(),
                    checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
                    remarks: record.remarks || '',
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
        const {
            internshipId,
            studentId,
            status,
            startDate,
            endDate,
            month,
            year,
            page = 1,
            limit = 50,
        } = filters;

        const query = {};

        // Students can only see their own
        if (userRole === 'student') {
            query.studentId = userId;
        }

        if (internshipId) {
            query.internshipId = internshipId;

            // Trainers can only see their internships - FIXED
            if (userRole === 'trainer') {
                const internship = await Internship.findById(internshipId);
                if (!internship) {
                    throw new AppError('Internship not found', 404);
                }

                if (!internship.trainerId) {
                    throw new AppError('Internship trainer not assigned', 403);
                }

                if (internship.trainerId.toString() !== userId.toString()) {
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

        if (month) {
            query.month = parseInt(month);
        }

        if (year) {
            query.year = parseInt(year);
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            Attendance.find(query)
                .populate('studentId', 'name email rollNumber')
                .populate('internshipId', 'title code')
                .populate('markedBy', 'name role')
                .populate('editedBy', 'name role')
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
            if (!internship || !internship.trainerId) {
                throw new AppError('Access denied', 403);
            }
            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('Access denied', 403);
            }
        }

        return attendance;
    }

    /**
     * Update attendance (Trainer/Admin only)
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

        // Trainer authorization - FIXED
        if (userRole === 'trainer') {
            const internship = await Internship.findById(attendance.internshipId);
            if (!internship || !internship.trainerId) {
                throw new AppError('Access denied to this internship', 403);
            }
            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('Access denied to this internship', 403);
            }
        }

        // Update allowed fields
        const allowedFields = ['status', 'remarks', 'checkInTime', 'checkOutTime'];
        const updateData = {};

        allowedFields.forEach((field) => {
            if (updates[field] !== undefined) {
                if (field === 'checkInTime' || field === 'checkOutTime') {
                    updateData[field] = new Date(updates[field]);
                } else {
                    updateData[field] = updates[field];
                }
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
     * Delete attendance (Admin only)
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
     * Get monthly attendance stats
     */
    async getMonthlyStats(internshipId, studentId, month, year, userId, userRole) {
        // Authorization
        if (userRole === 'student' && studentId.toString() !== userId.toString()) {
            throw new AppError('Cannot view other students statistics', 403);
        }

        if (userRole === 'trainer') {
            const internship = await Internship.findById(internshipId);
            if (!internship || !internship.trainerId) {
                throw new AppError('Access denied to this internship', 403);
            }
            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('Access denied to this internship', 403);
            }
        }

        const stats = await Attendance.getMonthlyStats(internshipId, studentId, month, year);

        // Get attendance records for the month
        const records = await Attendance.find({
            internshipId,
            studentId,
            month: parseInt(month),
            year: parseInt(year),
        })
            .sort({ date: 1 })
            .select('date status checkInTime checkOutTime duration remarks')
            .lean();

        return {
            stats,
            records,
        };
    }

    /**
     * Get internship monthly report - FIXED
     */
    async getInternshipMonthlyReport(internshipId, month, year, userId, userRole) {
        // Validate internship
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Authorization: Trainer must be assigned - FIXED
        if (userRole === 'trainer') {
            if (!internship.trainerId) {
                throw new AppError('Trainer not assigned to this internship', 403);
            }

            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('You are not authorized to generate this report', 403);
            }
        }

        // Student-wise report
        const report = await Attendance.getInternshipMonthlyReport(internshipId, month, year);

        // Overall statistics
        const overallStats = await Attendance.aggregate([
            {
                $match: {
                    internshipId: new mongoose.Types.ObjectId(internshipId),

                    month: parseInt(month),
                    year: parseInt(year),
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
            month: parseInt(month),
            year: parseInt(year),
            overallStats,
            studentReports: report,
        };
    }

    /**
     * Get trainer's enrolled students
     */
    async getEnrolledStudents(internshipId, userId, userRole) {
        // Validate internship
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Check trainer ownership - FIXED
        if (userRole === 'trainer') {
            if (!internship.trainerId) {
                throw new AppError('Internship trainer not assigned', 403);
            }
            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('Access denied to this internship', 403);
            }
        }

        // Get enrolled students
        const enrollments = await Enrollment.find({
            internshipId,
            status: 'active',
        })
            .populate('studentId', 'fullName email rollNumber')
            .lean();

        return enrollments.map((e) => e.studentId);
    }
}

module.exports = new AttendanceService();