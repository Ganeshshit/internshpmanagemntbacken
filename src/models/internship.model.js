// src/models/internship.model.js
const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema(
    {
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
            maxlength: 2000,
        },

        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
        },

        endDate: {
            type: Date,
            required: [true, 'End date is required'],
            validate: {
                validator: function (value) {
                    return value > this.startDate;
                },
                message: 'End date must be after start date',
            },
        },

        trainerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Trainer is required'],
        },

        status: {
            type: String,
            enum: ['draft', 'active', 'completed', 'cancelled','ongoing'],
            default: 'draft',
        },

        totalSeats: {
            type: Number,
            default: null,
            min: 1,
        },

        enrolledCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        skills: [{
            type: String,
            trim: true,
        }],

        requirements: [{
            type: String,
            trim: true,
        }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
internshipSchema.index({ trainerId: 1, status: 1 });
internshipSchema.index({ startDate: 1, endDate: 1 });
internshipSchema.index({ status: 1 });

// Virtual for duration
internshipSchema.virtual('duration').get(function () {
    if (this.startDate && this.endDate) {
        const diff = this.endDate - this.startDate;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
});

// Virtual populate for enrollments
internshipSchema.virtual('enrollments', {
    ref: 'InternshipEnrollment',
    localField: '_id',
    foreignField: 'internshipId',
});

// Virtual populate for assignments
internshipSchema.virtual('assignments', {
    ref: 'Assignment',
    localField: '_id',
    foreignField: 'internshipId',
});

// Methods
internshipSchema.methods.isActive = function () {
    const now = new Date();
    return this.status === 'active' &&
        this.startDate <= now &&
        this.endDate >= now;
};

internshipSchema.methods.hasAvailableSeats = function () {
    if (!this.totalSeats) return true;
    return this.enrolledCount < this.totalSeats;
};

module.exports = mongoose.model('Internship', internshipSchema);

