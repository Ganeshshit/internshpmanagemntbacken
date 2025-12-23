// src/validations/auth.validation.js
const Joi = require('joi');
const { ROLES } = require('../constants/roles');

const authValidation = {
  register: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().required(),
      password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
          'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
        }),
      role: Joi.string()
        .valid(...Object.values(ROLES))
        .default(ROLES.STUDENT),
    }),
  },

  login: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
  },

  refreshToken: {
    body: Joi.object({
      refreshToken: Joi.string().required(),
    }),
  },

  changePassword: {
    body: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
          'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
        }),
    }),
  },

  // ✅ NEW: Forgot Password Validation
  forgotPassword: {
    body: Joi.object({
      email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    }),
  },

  // ✅ NEW: Reset Password Validation
  resetPassword: {
    body: Joi.object({
      token: Joi.string().required().messages({
        'any.required': 'Reset token is required',
      }),
      newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
          'string.min': 'Password must be at least 8 characters',
          'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
          'any.required': 'New password is required',
        }),
    }),
  },
};

module.exports = authValidation;
