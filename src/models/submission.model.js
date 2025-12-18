// src/models/submission.model.js (Add mimeType field)
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
    {
        assignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assignment',
            required: [true, 'Assignment is required'],
        },

        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Student is required'],
        },

        submissionType: {
            type: String,
            enum: ['pdf', 'text'],
            required: [true, 'Submission type is required'],
        },

        fileUrl: {
            type: String,
            default: null,
        },

        fileName: {
            type: String,
            default: null,
        },

        fileSize: {
            type: Number,
            default: null,
        },

        mimeType: {
            type: String,
            default: null,
        },

        textContent: {
            type: String,
            default: null,
            maxlength: 10000,
        },

        submittedAt: {
            type: Date,
            default: Date.now,
        },

        marks: {
            type: Number,
            default: null,
            min: 0,
        },

        feedback: {
            type: String,
            default: null,
            maxlength: 2000,
        },

        evaluatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        evaluatedAt: {
            type: Date,
            default: null,
        },

        status: {
            type: String,
            enum: ['submitted', 'under_review', 'evaluated', 'resubmit_required'],
            default: 'submitted',
        },

        isLate: {
            type: Boolean,
            default: false,
        },

        submissionAttempt: {
            type: Number,
            default: 1,
            min: 1,
        },

        plagiarismScore: {
            type: Number,
            default: null,
            min: 0,
            max: 100,
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
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound index
submissionSchema.index({ assignmentId: 1, studentId: 1 });
submissionSchema.index({ studentId: 1, status: 1 });
submissionSchema.index({ assignmentId: 1, status: 1 });
submissionSchema.index({ submittedAt: -1 });

// Virtuals
submissionSchema.virtual('grade').get(function () {
    if (this.marks === null) return null;

    const percentage = (this.marks / 100) * 100;

    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 30) return 'D';
    return 'F';
});

submissionSchema.virtual('isEvaluated').get(function () {
    return this.marks !== null && this.status === 'evaluated';
});

// Methods
submissionSchema.methods.evaluate = function (marks, feedback, evaluatedById) {
    this.marks = marks;
    this.feedback = feedback;
    this.evaluatedBy = evaluatedById;
    this.evaluatedAt = new Date();
    this.status = 'evaluated';
    return this.save();
};

submissionSchema.methods.requestResubmission = function (feedback, evaluatedById) {
    this.feedback = feedback;
    this.evaluatedBy = evaluatedById;
    this.evaluatedAt = new Date();
    this.status = 'resubmit_required';
    return this.save();
};

// Pre-save middleware
submissionSchema.pre('save', async function () {
    if (!this.isNew) return;

    const Assignment = mongoose.model('Assignment');
    const assignment = await Assignment.findById(this.assignmentId);

    if (assignment && this.submittedAt > assignment.dueDate) {
        this.isLate = true;
    }
});

module.exports = mongoose.model('AssignmentSubmission', submissionSchema);