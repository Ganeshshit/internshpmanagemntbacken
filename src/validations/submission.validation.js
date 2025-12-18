// src/validations/submission.validation.js
const Joi = require('joi');

const submissionValidation = {
    /**
     * Get submission by ID
     */
    getById: {
        params: Joi.object({
            id: Joi.string().required().hex().length(24).messages({
                'string.hex': 'Invalid submission ID format',
                'string.length': 'Invalid submission ID format',
                'any.required': 'Submission ID is required',
            }),
        }),
    },

    /**
     * Evaluate submission
     */
    evaluate: {
        params: Joi.object({
            id: Joi.string().required().hex().length(24),
        }),
        body: Joi.object({
            marks: Joi.number().required().min(0).messages({
                'number.base': 'Marks must be a number',
                'number.min': 'Marks cannot be negative',
                'any.required': 'Marks are required',
            }),
            feedback: Joi.string().required().min(10).max(2000).messages({
                'string.empty': 'Feedback is required',
                'string.min': 'Feedback must be at least 10 characters',
                'string.max': 'Feedback cannot exceed 2000 characters',
                'any.required': 'Feedback is required',
            }),
        }),
    },

    /**
     * Request resubmission
     */
    requestResubmit: {
        params: Joi.object({
            id: Joi.string().required().hex().length(24),
        }),
        body: Joi.object({
            feedback: Joi.string().required().min(20).max(2000).messages({
                'string.empty': 'Feedback is required for resubmission request',
                'string.min': 'Feedback must be at least 20 characters',
                'string.max': 'Feedback cannot exceed 2000 characters',
                'any.required': 'Feedback is required',
            }),
        }),
    },

    /**
     * Get submissions by assignment
     */
    getByAssignment: {
        params: Joi.object({
            assignmentId: Joi.string().required().hex().length(24),
        }),
        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10),
            status: Joi.string().valid('submitted', 'under_review', 'evaluated', 'resubmit_required'),
            isLate: Joi.boolean(),
            evaluated: Joi.boolean(),
            sortBy: Joi.string().valid('submittedAt', 'marks', 'studentName').default('submittedAt'),
            sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        }),
    },

    /**
     * Delete submission
     */
    delete: {
        params: Joi.object({
            id: Joi.string().required().hex().length(24),
        }),
    },

    /**
     * Get my submissions (student)
     */
    getMySubmissions: {
        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10),
            status: Joi.string().valid('submitted', 'under_review', 'evaluated', 'resubmit_required'),
            internshipId: Joi.string().hex().length(24),
            sortBy: Joi.string().valid('submittedAt', 'marks').default('submittedAt'),
            sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        }),
    },

    /**
     * Resubmit assignment
     */
    resubmit: {
        params: Joi.object({
            id: Joi.string().required().hex().length(24),
        }),
        body: Joi.object({
            submissionType: Joi.string().valid('pdf', 'text').required(),
            textContent: Joi.when('submissionType', {
                is: 'text',
                then: Joi.string().required().min(50).max(10000).messages({
                    'string.empty': 'Text content is required',
                    'string.min': 'Text content must be at least 50 characters',
                }),
                otherwise: Joi.forbidden(),
            }),
        }),
    },
};

module.exports = submissionValidation;