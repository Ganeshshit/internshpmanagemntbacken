// src/models/enrollment.model.js
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
    {
        internshipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Internship',
            required: [true, 'Internship is required'],
        },

        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },

        status: {
            type: String,
            enum: ['pending', 'active', 'completed', 'dropped', 'cancelled'],
            default: 'active',
        },

        enrolledAt: {
            type: Date,
            default: Date.now,
        },

        completedAt: {
            type: Date,
            default: null,
        },

        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        remarks: {
            type: String,
            default: null,
        },

        finalGrade: {
            type: String,
            enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F', null],
            default: null,
        },

        certificateIssued: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound index to prevent duplicate enrollments
enrollmentSchema.index({ internshipId: 1, studentId: 1 }, { unique: true });
enrollmentSchema.index({ studentId: 1, status: 1 });
enrollmentSchema.index({ internshipId: 1, status: 1 });

// Virtual populate for attendance records
enrollmentSchema.virtual('attendanceRecords', {
    ref: 'Attendance',
    localField: '_id',
    foreignField: 'enrollmentId',
});

// Methods
enrollmentSchema.methods.markCompleted = function () {
    this.status = 'completed';
    this.completedAt = new Date();
    this.progress = 100;
    return this.save();
};

enrollmentSchema.methods.updateProgress = async function () {
    // Calculate progress based on assignments, quizzes, attendance
    // This is a placeholder - implement based on your logic
    const Submission = mongoose.model('AssignmentSubmission');
    const Assignment = mongoose.model('Assignment');

    const totalAssignments = await Assignment.countDocuments({
        internshipId: this.internshipId
    });

    if (totalAssignments === 0) {
        this.progress = 0;
        return this.save();
    }

    const completedAssignments = await Submission.countDocuments({
        studentId: this.studentId,
        marks: { $ne: null },
    });

    this.progress = Math.round((completedAssignments / totalAssignments) * 100);
    return this.save();
};

module.exports = mongoose.model('InternshipEnrollment', enrollmentSchema);