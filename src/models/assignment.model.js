// src/models/assignment.model.js
const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
    {
        internshipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Internship',
            required: [true, 'Internship is required'],
        },

        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            minlength: 3,
            maxlength: 200,
        },

        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            minlength: 10,
            maxlength: 5000,
        },

        type: {
            type: String,
            enum: ['pdf', 'text', 'quiz'],
            required: [true, 'Type is required'],
        },

        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },

        totalMarks: {
            type: Number,
            required: [true, 'Total marks is required'],
            min: 1,
            default: 100,
        },

        passingMarks: {
            type: Number,
            default: 40,
            min: 0,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },

        status: {
            type: String,
            enum: ['draft', 'published', 'closed'],
            default: 'draft',
        },

        attachments: [{
            fileName: String,
            fileUrl: String,
            fileSize: Number,
            uploadedAt: {
                type: Date,
                default: Date.now,
            },
        }],

        instructions: {
            type: String,
            default: null,
            maxlength: 2000,
        },

        allowLateSubmission: {
            type: Boolean,
            default: false,
        },
        maxResubmissions: {
            type: Number,
            default: 1,
            min: 1,
            max: 3,
        },

        lateSubmissionPenalty: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        publishedAt: {
            type: Date,
            default: null,
        },

        closedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
assignmentSchema.index({ internshipId: 1, status: 1 });
assignmentSchema.index({ createdBy: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ type: 1, status: 1 });

// Virtual populate for submissions
assignmentSchema.virtual('submissions', {
    ref: 'AssignmentSubmission',
    localField: '_id',
    foreignField: 'assignmentId',
});

// Virtuals
assignmentSchema.virtual('isOverdue').get(function () {
    return new Date() > this.dueDate && this.status === 'published';
});

assignmentSchema.virtual('daysUntilDue').get(function () {
    if (this.dueDate) {
        const diff = this.dueDate - new Date();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return null;
});

// Methods
assignmentSchema.methods.publish = function () {
    this.status = 'published';
    this.publishedAt = new Date();
    return this.save();
};

assignmentSchema.methods.close = function () {
    this.status = 'closed';
    this.closedAt = new Date();
    return this.save();
};

assignmentSchema.methods.getSubmissionStats = async function () {
    const Submission = mongoose.model('AssignmentSubmission');
    const Enrollment = mongoose.model('InternshipEnrollment');

    const totalStudents = await Enrollment.countDocuments({
        internshipId: this.internshipId,
        status: 'active',
    });

    const submissions = await Submission.countDocuments({
        assignmentId: this._id,
    });

    const evaluated = await Submission.countDocuments({
        assignmentId: this._id,
        marks: { $ne: null },
    });

    return {
        totalStudents,
        submitted: submissions,
        pending: totalStudents - submissions,
        evaluated,
        notEvaluated: submissions - evaluated,
    };
};

module.exports = mongoose.model('Assignment', assignmentSchema);



