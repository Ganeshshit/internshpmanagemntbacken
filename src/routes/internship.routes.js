// src/routes/internship.routes.js
// Enhanced route definitions with bulk operations and available students
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

// Get all trainer's internships (Trainer/Admin)
router.get(
    '/trainer/my-internships',
    isTrainerOrAdmin,
    validate(internshipValidation.list),
    internshipController.getTrainerInternships
);

// Get enrolled students for internship (Trainer/Admin)
router.get(
    '/:id/students',
    isTrainerOrAdmin,
    validate(internshipValidation.getEnrolledStudents),
    internshipController.getEnrolledStudents
);

// Get available students (not enrolled) (Trainer/Admin) - NEW
router.get(
    '/:id/available-students',
    isTrainerOrAdmin,
    internshipController.getAvailableStudents
);

// Enroll student (Trainer/Admin)
router.post(
    '/:id/enroll',
    isTrainerOrAdmin,
    validate(internshipValidation.enrollStudent),
    internshipController.enrollStudent
);

// Bulk enroll students (Trainer/Admin) - NEW
router.post(
    '/:id/bulk-enroll',
    isTrainerOrAdmin,
    internshipController.bulkEnrollStudents
);

// Unenroll student (Trainer/Admin)
router.delete(
    '/:internshipId/unenroll/:studentId',
    isTrainerOrAdmin,
    validate(internshipValidation.unenrollStudent),
    internshipController.unenrollStudent
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