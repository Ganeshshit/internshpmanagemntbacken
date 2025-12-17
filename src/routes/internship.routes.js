// src/routes/internship.routes.js
// Internship route definitions
const express = require('express');
const internshipController = require('../controllers/internship.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isAdmin, isTrainer, isTrainerOrAdmin, isStudent } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const internshipValidation = require('../validations/internship.validation');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ===============================
// Admin & Trainer Routes
// ===============================

// Create internship (Trainer/Admin)
router.post(
    '/',
    isTrainerOrAdmin,
    validate(internshipValidation.create),
    internshipController.createInternship
);

// Update internship (Trainer/Admin)
router.put(
    '/:id',
    isTrainerOrAdmin,
    validate(internshipValidation.update),
    internshipController.updateInternship
);

// Delete internship (Admin only)
router.delete(
    '/:id',
    isAdmin,
    validate(internshipValidation.delete),
    internshipController.deleteInternship
);

// Get all internships (Admin/Trainer)
router.get(
    '/trainer/all',
    isTrainerOrAdmin,
    validate(internshipValidation.list),
    internshipController.getTrainerInternships
);

// Enroll student (Trainer/Admin)
router.post(
    '/:id/enroll',
    isTrainerOrAdmin,
    validate(internshipValidation.enrollStudent),
    internshipController.enrollStudent
);

// Unenroll student (Trainer/Admin)
router.delete(
    '/:internshipId/students/:studentId',
    isTrainerOrAdmin,
    validate(internshipValidation.unenrollStudent),
    internshipController.unenrollStudent
);

// Get enrolled students for internship (Trainer/Admin)
router.get(
    '/:id/students',
    isTrainerOrAdmin,
    validate(internshipValidation.getEnrolledStudents),
    internshipController.getEnrolledStudents
);

// ===============================
// Student Routes
// ===============================

// Get student's enrolled internships
router.get(
    '/student/my-internships',
    isStudent,
    internshipController.getStudentInternships
);

// ===============================
// Common Routes (All authenticated users)
// ===============================

// Get single internship by ID
router.get(
    '/:id',
    validate(internshipValidation.getById),
    internshipController.getInternshipById
);

// Get all internships (filtered by role)
router.get(
    '/',
    validate(internshipValidation.list),
    internshipController.getAllInternships
);

module.exports = router;



