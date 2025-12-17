// src/middlewares/role.middleware.js
// Role-based access control middleware

const { AppError } = require('./error.middleware');
const { ROLES, hasHigherRole } = require('../constants/roles');
const { hasPermission } = require('../constants/permissions');

/**
 * Check if user has required role
 * @param {Array|String} allowedRoles - Single role or array of roles
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      throw new AppError('Access denied. Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Check if user has required permission
 * @param {String} permission - Required permission
 */
const permissionMiddleware = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!hasPermission(req.user.role, permission)) {
      throw new AppError('Access denied. Missing required permission', 403);
    }

    next();
  };
};

/**
 * Check if user has minimum role level
 * @param {String} minimumRole - Minimum required role
 */
const minimumRoleMiddleware = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (!hasHigherRole(req.user.role, minimumRole)) {
      throw new AppError('Access denied. Insufficient role level', 403);
    }

    next();
  };
};

/**
 * Predefined role middlewares
 */
const isAdmin = roleMiddleware(ROLES.ADMIN);
const isTrainer = roleMiddleware(ROLES.TRAINER);
const isStudent = roleMiddleware(ROLES.STUDENT);
const isTrainerOrAdmin = roleMiddleware([ROLES.TRAINER, ROLES.ADMIN]);

module.exports = {
  roleMiddleware,
  permissionMiddleware,
  minimumRoleMiddleware,
  isAdmin,
  isTrainer,
  isStudent,
  isTrainerOrAdmin,
};