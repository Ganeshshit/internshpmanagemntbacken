// src/validations/internship.validation.js
// Internship validation schemas

const Joi = require('joi');
const { commonSchemas } = require('../middlewares/validate.middleware');

const internshipValidation = {
  create: {
    body: Joi.object({
      title: Joi.string().min(3).max(200).required(),
      description: Joi.string().min(10).max(2000).required(),
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
      trainerId: commonSchemas.id.optional(),
    }),
  },

  update: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    body: Joi.object({
      title: Joi.string().min(3).max(200),
      description: Joi.string().min(10).max(2000),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      trainerId: commonSchemas.id.optional(),
      // trainerId: commonSchemas.id,
    }),
  },

  getById: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
  },

  delete: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
  },

  list: {
    query: Joi.object({
      page: commonSchemas.pagination.page,
      limit: commonSchemas.pagination.limit,
      trainerId: commonSchemas.id.optional(),
      status: Joi.string().valid('upcoming', 'ongoing', 'completed'),
      search: Joi.string().allow(''),
    }),
  },

  enrollStudent: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    body: Joi.object({
      studentId: commonSchemas.id.required(),
    }),
  },

  unenrollStudent: {
    params: Joi.object({
      internshipId: commonSchemas.id,
      studentId: commonSchemas.id,
    }),
  },

  getEnrolledStudents: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    query: Joi.object({
      page: commonSchemas.pagination.page,
      limit: commonSchemas.pagination.limit,
      status: Joi.string().valid('active', 'completed'),
    }),
  },
};

module.exports = internshipValidation;