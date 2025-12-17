// src/validations/user.validation.js
// User validation schemas

const Joi = require('joi');
const { ROLES } = require('../constants/roles');
const { commonSchemas } = require('../middlewares/validate.middleware');

const userValidation = {
  getById: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
  },

  create: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      role: Joi.string()
        .valid(...Object.values(ROLES))
        .required(),
      status: Joi.string().valid('active', 'inactive').default('active'),
    }),
  },

  update: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    body: Joi.object({
      name: Joi.string().min(2).max(100),
      email: Joi.string().email(),
      role: Joi.string().valid(...Object.values(ROLES)),
      status: Joi.string().valid('active', 'inactive'),
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
      role: Joi.string().valid(...Object.values(ROLES)),
      status: Joi.string().valid('active', 'inactive'),
      search: Joi.string().allow(''),
    }),
  },

  updateProfile: {
    body: Joi.object({
      name: Joi.string().min(2).max(100),
      email: Joi.string().email(),
    }),
  },
};

module.exports = userValidation;