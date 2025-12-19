// src/models/attendance.model.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        internshipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Internship',
            required: [true, 'Internship is required'],
            index: true,
        },

        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
            index: true,
        },

        date: {
            type: Date,
            required: [true, 'Date is required'],
            index: true,
        },

        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            required: [true, 'Status is required'],
            default: 'present',
        },

        checkInTime: {
            type: Date,
            default: null,
        },

        checkOutTime: {
            type: Date,
            default: null,
        },

        isLate: {
            type: Boolean,
            default: false,
        },

        lateBy: {
            type: Number, // minutes
            default: 0,
        },

        remarks: {
            type: String,
            maxlength: 500,
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

        isApproved: {
            type: Boolean,
            default: true, // Auto-approved for trainer/admin
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: null,
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
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound indexes
attendanceSchema.index({ internshipId: 1, studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ internshipId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ status: 1, isApproved: 1 });

// Geospatial index
attendanceSchema.index({ location: '2dsphere' });

// Virtuals
attendanceSchema.virtual('duration').get(function () {
    if (this.checkInTime && this.checkOutTime) {
        return Math.floor((this.checkOutTime - this.checkInTime) / (1000 * 60)); // minutes
    }
    return null;
});

attendanceSchema.virtual('dateOnly').get(function () {
    return this.date.toISOString().split('T')[0];
});

// Methods
attendanceSchema.methods.approve = async function (approverId) {
    this.isApproved = true;
    this.approvedBy = approverId;
    this.approvedAt = new Date();
    return this.save();
};

attendanceSchema.methods.reject = async function () {
    this.isApproved = false;
    this.approvedBy = null;
    this.approvedAt = null;
    return this.save();
};

attendanceSchema.methods.updateStatus = async function (newStatus, editedBy, reason) {
    this.status = newStatus;
    this.isEdited = true;
    this.editedBy = editedBy;
    this.editedAt = new Date();
    this.editReason = reason;
    return this.save();
};

attendanceSchema.methods.checkOut = async function () {
    this.checkOutTime = new Date();
    return this.save();
};

// Statics
attendanceSchema.statics.getAttendanceStats = async function (internshipId, studentId) {
    const stats = await this.aggregate([
        {
            $match: {
                internshipId: mongoose.Types.ObjectId(internshipId),
                studentId: mongoose.Types.ObjectId(studentId),
            },
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const total = stats.reduce((sum, item) => sum + item.count, 0);
    const present = stats.find((s) => s._id === 'present')?.count || 0;

    return {
        total,
        present,
        absent: stats.find((s) => s._id === 'absent')?.count || 0,
        late: stats.find((s) => s._id === 'late')?.count || 0,
        excused: stats.find((s) => s._id === 'excused')?.count || 0,
        percentage: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
    };
};

attendanceSchema.statics.getInternshipAttendanceReport = async function (
    internshipId,
    startDate,
    endDate
) {
    const match = {
        internshipId: mongoose.Types.ObjectId(internshipId),
    };

    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate);
        if (endDate) match.date.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: {
                    studentId: '$studentId',
                    status: '$status',
                },
                count: { $sum: 1 },
            },
        },
        {
            $group: {
                _id: '$_id.studentId',
                attendance: {
                    $push: {
                        status: '$_id.status',
                        count: '$count',
                    },
                },
                total: { $sum: '$count' },
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
                attendance: 1,
                total: 1,
                present: {
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: '$attendance',
                                    as: 'a',
                                    cond: { $eq: ['$$a.status', 'present'] },
                                },
                            },
                            as: 'p',
                            in: '$$p.count',
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                percentage: {
                    $cond: [
                        { $gt: ['$total', 0] },
                        { $multiply: [{ $divide: ['$present', '$total'] }, 100] },
                        0,
                    ],
                },
            },
        },
        {
            $sort: { percentage: -1 },
        },
    ]);
};

// Pre-save middleware
attendanceSchema.pre('save', function (next) {
    // Auto-approve if marked by trainer or admin
    if (this.isNew && ['trainer', 'admin'].includes(this.markedByRole)) {
        this.isApproved = true;
        this.approvedBy = this.markedBy;
        this.approvedAt = new Date();
    }

    // Calculate late status
    if (this.checkInTime && !this.isLate) {
        const checkInHour = this.checkInTime.getHours();
        const checkInMinute = this.checkInTime.getMinutes();
        const expectedTime = 9 * 60; // 9:00 AM in minutes
        const actualTime = checkInHour * 60 + checkInMinute;

        if (actualTime > expectedTime) {
            this.isLate = true;
            this.lateBy = actualTime - expectedTime;
            if (this.status === 'present') {
                this.status = 'late';
            }
        }
    }

    next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);