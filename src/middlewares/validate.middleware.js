// src/middlewares/validate.middleware.js
// Request validation middleware using Joi

const Joi = require('joi');
const { AppError } = require('./error.middleware');
const ApiResponse = require('../utils/response.util');

/**
 * Validate request against Joi schema
 * @param {Object} schema - Joi validation schema with body, params, query
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    };

    const toValidate = {};
    
    if (schema.body) toValidate.body = req.body;
    if (schema.params) toValidate.params = req.params;
    if (schema.query) toValidate.query = req.query;

    const schemaToValidate = Joi.object(schema);

    const { error, value } = schemaToValidate.validate(toValidate, validationOptions);

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
      }));

      return ApiResponse.validationError(res, errors);
    }

    // Replace request data with validated data
    if (value.body) req.body = value.body;
    if (value.params) req.params = value.params;
    if (value.query) req.query = value.query;

    next();
  };
};

/**
 * Common Joi schemas
 */
const commonSchemas = {
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid ID format',
  }),

  email: Joi.string().email().required(),

  password: Joi.string().min(8).required(),

  date: Joi.date().iso(),

  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  },
};

module.exports = {
  validate,
  commonSchemas,
};