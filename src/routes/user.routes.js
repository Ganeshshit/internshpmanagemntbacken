// src/routes/user.routes.js
// User management routes

const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin, isTrainerOrAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const userValidation = require('../validations/user.validation');

const router = express.Router();

// ===============================
// Protected Routes (Require Auth)
// ===============================
router.use(authMiddleware);

// ===============================
// Current User Profile
// ===============================
router.get('/me', userController.getProfile);
router.put('/me', validate(userValidation.updateProfile), userController.updateProfile);
router.put('/me/password', userController.updatePassword);

// ===============================
// Admin/Trainer Routes
// ===============================

// Get all users (Admin only)
router.get(
    '/',
    isTrainerOrAdmin,
    validate(userValidation.list),
    userController.getAllUsers
);

// Get user by ID (Admin or Trainer)
router.get(
    '/:id',
    isTrainerOrAdmin,
    validate(userValidation.getById),
    userController.getUserById
);

// Create new user (Admin only)
router.post(
    '/',
    isTrainerOrAdmin,
    validate(userValidation.create),
    userController.createUser
);

// Update user (Admin only)
router.put(
    '/:id',
    isAdmin,
    validate(userValidation.update),
    userController.updateUser
);

// Delete user (Admin only)
router.delete(
    '/:id',
    isAdmin,
    validate(userValidation.delete),
    userController.deleteUser
);

// Activate/Deactivate user (Admin only)
router.patch(
    '/:id/status',
    isAdmin,
    validate(userValidation.getById),
    userController.toggleUserStatus
);

// Get students only (Trainer can access)
router.get(
    '/students/list',
    isTrainerOrAdmin,
    validate(userValidation.list),
    userController.getStudents
);

// Get trainers only (Admin only)
router.get(
    '/trainers/list',
    isAdmin,
    validate(userValidation.list),
    userController.getTrainers
);

module.exports = router;