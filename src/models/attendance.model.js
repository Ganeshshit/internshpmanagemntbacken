// src/models/attendance.model.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        internshipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Internship',
            required: true,
            index: true,
        },
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
            index: true,
        },
        year: {
            type: Number,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused', 'half-day'],
            default: 'present',
            required: true,
        },
        checkInTime: {
            type: Date,
            default: null,
        },
        checkOutTime: {
            type: Date,
            default: null,
        },
        duration: {
            type: Number, // Duration in minutes
            default: null,
        },
        isLate: {
            type: Boolean,
            default: false,
        },
        lateBy: {
            type: Number, // Minutes late
            default: 0,
        },
        remarks: {
            type: String,
            maxlength: 500,
            default: '',
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },
        ipAddress: {
            type: String,
            default: null,
        },
        device: {
            type: String,
            default: null,
        },
        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        markedByRole: {
            type: String,
            enum: ['student', 'trainer', 'admin'],
            required: true,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        editedAt: {
            type: Date,
            default: null,
        },
        editReason: {
            type: String,
            maxlength: 500,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
attendanceSchema.index({ internshipId: 1, studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ internshipId: 1, month: 1, year: 1 });
attendanceSchema.index({ studentId: 1, month: 1, year: 1 });
attendanceSchema.index({ status: 1, date: -1 });

// Geospatial index for location
attendanceSchema.index({ location: '2dsphere' });

// Pre-save middleware to calculate duration and late status
attendanceSchema.pre('save', async function () {
    if (this.checkInTime && this.checkOutTime) {
        const diffMs = this.checkOutTime - this.checkInTime;
        this.duration = Math.floor(diffMs / (1000 * 60));
    }

    if (this.date) {
        this.month = this.date.getMonth() + 1;
        this.year = this.date.getFullYear();
    }
});

// Static method: Get monthly statistics for a student
attendanceSchema.statics.getMonthlyStats = async function (
    internshipId,
    studentId,
    month,
    year
) {
    const stats = await this.aggregate([
        {
            $match: {
                internshipId: new mongoose.Types.ObjectId(internshipId),
                studentId: new mongoose.Types.ObjectId(studentId),
                month: parseInt(month),
                year: parseInt(year),
            }

        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                present: {
                    $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
                },
                absent: {
                    $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
                },
                late: {
                    $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
                },
                excused: {
                    $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] },
                },
                halfDay: {
                    $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] },
                },
                totalDuration: { $sum: '$duration' },
            },
        },
        {
            $project: {
                _id: 0,
                total: 1,
                present: 1,
                absent: 1,
                late: 1,
                excused: 1,
                halfDay: 1,
                totalDuration: 1,
                percentage: {
                    $cond: [
                        { $eq: ['$total', 0] },
                        0,
                        {
                            $multiply: [
                                { $divide: ['$present', '$total'] },
                                100,
                            ],
                        },
                    ],
                },
            },
        },
    ]);

    return stats[0] || {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        halfDay: 0,
        totalDuration: 0,
        percentage: 0,
    };
};

// Static method: Get internship monthly report (all students)
attendanceSchema.statics.getInternshipMonthlyReport = async function (
    internshipId,
    month,
    year
) {
    const report = await this.aggregate([
        {
            $match: {
                internshipId: new mongoose.Types.ObjectId(internshipId),
                month: parseInt(month),
                year: parseInt(year),
            }

        },
        {
            $group: {
                _id: '$studentId',
                total: { $sum: 1 },
                present: {
                    $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
                },
                absent: {
                    $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
                },
                late: {
                    $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
                },
                excused: {
                    $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] },
                },
                halfDay: {
                    $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] },
                },
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'student',
            },
        },
        {
            $unwind: '$student',
        },
        {
            $project: {
                studentId: '$_id',
                studentName: '$student.fullName',
                studentEmail: '$student.email',
                studentRollNumber: '$student.rollNumber',
                total: 1,
                present: 1,
                absent: 1,
                late: 1,
                excused: 1,
                halfDay: 1,
                percentage: {
                    $cond: [
                        { $eq: ['$total', 0] },
                        0,
                        {
                            $multiply: [
                                { $divide: ['$present', '$total'] },
                                100,
                            ],
                        },
                    ],
                },
            },
        },
        {
            $sort: { studentName: 1 },
        },
    ]);

    return report;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;