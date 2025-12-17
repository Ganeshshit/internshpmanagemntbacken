// src/models/attendance.model.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },

        internshipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Internship',
            required: [true, 'Internship is required'],
        },

        enrollmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InternshipEnrollment',
            required: false,
        },

        date: {
            type: Date,
            required: [true, 'Date is required'],
        },

        status: {
            type: String,
            enum: ['present', 'absent', 'late', 'excused'],
            required: [true, 'Status is required'],
        },

        markedBy: {
            type: String,
            enum: ['student', 'trainer', 'admin'],
            required: [true, 'Marker role is required'],
        },

        markedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        markedAt: {
            type: Date,
            default: Date.now,
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

        isApproved: {
            type: Boolean,
            default: false,
        },

        remarks: {
            type: String,
            default: null,
            maxlength: 500,
        },

        checkInTime: {
            type: Date,
            default: null,
        },

        checkOutTime: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to prevent duplicate attendance for same student on same day
attendanceSchema.index({
    studentId: 1,
    internshipId: 1,
    date: 1
}, { unique: true });

attendanceSchema.index({ internshipId: 1, date: -1 });
attendanceSchema.index({ studentId: 1, date: -1 });
attendanceSchema.index({ date: -1, status: 1 });

// Static methods
attendanceSchema.statics.getAttendanceStats = async function (studentId, internshipId) {
    const stats = await this.aggregate([
        {
            $match: {
                studentId: mongoose.Types.ObjectId(studentId),
                internshipId: mongoose.Types.ObjectId(internshipId),
            },
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const result = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
    };

    stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
    });

    result.percentage = result.total > 0
        ? ((result.present + result.late) / result.total * 100).toFixed(2)
        : 0;

    return result;
};

// Methods
attendanceSchema.methods.approve = function (approvedById) {
    this.isApproved = true;
    this.approvedBy = approvedById;
    this.approvedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Attendance', attendanceSchema);