// src/models/quiz.model.js
const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
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
            default: null,
            maxlength: 1000,
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

        duration: {
            type: Number, // in minutes
            required: [true, 'Duration is required'],
            min: 1,
        },

        startDate: {
            type: Date,
            default: null,
        },

        endDate: {
            type: Date,
            default: null,
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

        instructions: {
            type: String,
            default: null,
            maxlength: 2000,
        },

        allowMultipleAttempts: {
            type: Boolean,
            default: false,
        },

        maxAttempts: {
            type: Number,
            default: 1,
            min: 1,
        },

        shuffleQuestions: {
            type: Boolean,
            default: false,
        },

        showCorrectAnswers: {
            type: Boolean,
            default: true,
        },

        showResultsImmediately: {
            type: Boolean,
            default: true,
        },

        questionCount: {
            type: Number,
            default: 0,
            min: 0,
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
quizSchema.index({ internshipId: 1, status: 1 });
quizSchema.index({ createdBy: 1 });
quizSchema.index({ startDate: 1, endDate: 1 });

// Virtual populate for questions
quizSchema.virtual('questions', {
    ref: 'QuizQuestion',
    localField: '_id',
    foreignField: 'quizId',
});

// Virtual populate for attempts
quizSchema.virtual('attempts', {
    ref: 'QuizAttempt',
    localField: '_id',
    foreignField: 'quizId',
});

// Virtuals
quizSchema.virtual('isActive').get(function () {
    const now = new Date();
    return this.status === 'published' &&
        (!this.startDate || this.startDate <= now) &&
        (!this.endDate || this.endDate >= now);
});

quizSchema.virtual('durationInSeconds').get(function () {
    return this.duration * 60;
});

// Methods
quizSchema.methods.publish = function () {
    this.status = 'published';
    this.publishedAt = new Date();
    return this.save();
};

quizSchema.methods.close = function () {
    this.status = 'closed';
    this.closedAt = new Date();
    return this.save();
};

quizSchema.methods.getAttemptStats = async function () {
    const QuizAttempt = mongoose.model('QuizAttempt');
    const Enrollment = mongoose.model('InternshipEnrollment');

    const totalStudents = await Enrollment.countDocuments({
        internshipId: this.internshipId,
        status: 'active',
    });

    const attempts = await QuizAttempt.countDocuments({
        quizId: this._id,
    });

    const uniqueStudents = await QuizAttempt.distinct('studentId', {
        quizId: this._id,
    });

    const avgScore = await QuizAttempt.aggregate([
        { $match: { quizId: this._id } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } },
    ]);

    return {
        totalStudents,
        attemptsCount: attempts,
        attemptedBy: uniqueStudents.length,
        notAttempted: totalStudents - uniqueStudents.length,
        averageScore: avgScore.length > 0 ? avgScore[0].avgScore.toFixed(2) : 0,
    };
};

module.exports = mongoose.model('Quiz', quizSchema);