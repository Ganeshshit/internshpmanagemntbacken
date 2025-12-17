// src/validations/assignment.validation.js
const Joi = require('joi');
const { commonSchemas } = require('../middlewares/validate.middleware');

const assignmentValidation = {
    // Create assignment
    create: {
        body: Joi.object({
            internshipId: commonSchemas.id.required(),
            title: Joi.string().min(3).max(200).required(),
            description: Joi.string().min(10).max(5000).required(),
            type: Joi.string().valid('pdf', 'text', 'quiz').required(),
            dueDate: Joi.date().iso().greater('now').required(),
            totalMarks: Joi.number().min(1).default(100),
            passingMarks: Joi.number().min(0).max(Joi.ref('totalMarks')),
            instructions: Joi.string().max(2000).allow('', null),
            allowLateSubmission: Joi.boolean().default(false),
            lateSubmissionPenalty: Joi.number().min(0).max(100).default(0),
            status: Joi.string().valid('draft', 'published').default('draft'),
        }),
    },

    // Update assignment
    update: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
        body: Joi.object({
            title: Joi.string().min(3).max(200),
            description: Joi.string().min(10).max(5000),
            type: Joi.string().valid('pdf', 'text', 'quiz'),
            dueDate: Joi.date().iso(),
            totalMarks: Joi.number().min(1),
            passingMarks: Joi.number().min(0),
            instructions: Joi.string().max(2000).allow('', null),
            allowLateSubmission: Joi.boolean(),
            lateSubmissionPenalty: Joi.number().min(0).max(100),
        }).min(1),
    },

    // Get by ID
    getById: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
    },

    // Delete assignment
    delete: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
    },

    // Publish assignment
    publish: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
    },

    // Close assignment
    close: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
    },

    // List assignments (trainer)
    list: {
        query: Joi.object({
            page: commonSchemas.pagination.page,
            limit: commonSchemas.pagination.limit,
            status: Joi.string().valid('draft', 'published', 'closed'),
            type: Joi.string().valid('pdf', 'text', 'quiz'),
            internshipId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
            search: Joi.string().allow(''),
            sortBy: Joi.string().valid('createdAt', 'dueDate', 'title'),
            sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        }),
    },

    // List assignments (student)
    studentList: {
        query: Joi.object({
            page: commonSchemas.pagination.page,
            limit: commonSchemas.pagination.limit,
            status: Joi.string().valid('published', 'closed'),
            type: Joi.string().valid('pdf', 'text', 'quiz'),
            internshipId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
            submitted: Joi.boolean(),
            overdue: Joi.boolean(),
        }),
    },

    // Submit assignment
    submit: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
        body: Joi.object({
            submissionType: Joi.string().valid('pdf', 'text').required(),
            textContent: Joi.string().max(10000).when('submissionType', {
                is: 'text',
                then: Joi.required(),
                otherwise: Joi.forbidden(),
            }),
        }),
    },

    // Get submissions
    getSubmissions: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
        query: Joi.object({
            page: commonSchemas.pagination.page,
            limit: commonSchemas.pagination.limit,
            status: Joi.string().valid('submitted', 'under_review', 'evaluated', 'resubmit_required'),
            isLate: Joi.boolean(),
            evaluated: Joi.boolean(),
        }),
    },

    // Get stats
    getStats: {
        params: Joi.object({
            id: commonSchemas.id,
        }),
    },

    // Get by internship
    getByInternship: {
        params: Joi.object({
            internshipId: commonSchemas.id,
        }),
        query: Joi.object({
            status: Joi.string().valid('draft', 'published', 'closed'),
            type: Joi.string().valid('pdf', 'text', 'quiz'),
        }),
    },
};

module.exports = assignmentValidation;