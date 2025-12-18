// src/routes/assignment.routes.js
const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isTrainer, isStudent, isTrainerOrAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const assignmentValidation = require('../validations/assignment.validation');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

// ==========================================
// TRAINER ROUTES
// ==========================================

/**
 * @route   POST /api/v1/assignments
 * @desc    Create new assignment
 * @access  Trainer
 */

router.post(
    '/',
    authMiddleware,
    isTrainer,
    uploadMiddleware.array('attachments', 5), // ✅ MUST come first
    validate(assignmentValidation.create),    // ✅ AFTER multer
    assignmentController.createAssignment
);

/**
 * @route   GET /api/v1/assignments/trainer
 * @desc    Get all assignments created by trainer
 * @access  Trainer
 */
router.get(
    '/trainer',
    authMiddleware,
    isTrainer,
    validate(assignmentValidation.list),
    assignmentController.getTrainerAssignments
);

/**
 * @route   GET /api/v1/assignments/:id
 * @desc    Get assignment by ID
 * @access  Trainer/Student
 */
router.get(
    '/:id',
    authMiddleware,
    validate(assignmentValidation.getById),
    assignmentController.getAssignmentById
);

/**
 * @route   PUT /api/v1/assignments/:id
 * @desc    Update assignment
 * @access  Trainer
 */
router.put(
    '/:id',
    authMiddleware,
    isTrainer,
    uploadMiddleware.array('attachments', 5),
    validate(assignmentValidation.update),
    assignmentController.updateAssignment
);

/**
 * @route   DELETE /api/v1/assignments/:id
 * @desc    Delete assignment
 * @access  Trainer
 */
router.delete(
    '/:id',
    authMiddleware,
    isTrainer,
    validate(assignmentValidation.delete),
    assignmentController.deleteAssignment
);

/**
 * @route   PATCH /api/v1/assignments/:id/publish
 * @desc    Publish assignment
 * @access  Trainer
 */
router.patch(
    '/:id/publish',
    authMiddleware,
    isTrainer,
    validate(assignmentValidation.publish),
    assignmentController.publishAssignment
);

/**
 * @route   PATCH /api/v1/assignments/:id/close
 * @desc    Close assignment
 * @access  Trainer
 */
router.patch(
    '/:id/close',
    authMiddleware,
    isTrainer,
    validate(assignmentValidation.close),
    assignmentController.closeAssignment
);

/**
 * @route   GET /api/v1/assignments/:id/submissions
 * @desc    Get all submissions for an assignment
 * @access  Trainer
 */
router.get(
    '/:id/submissions',
    authMiddleware,
    isTrainer,
    validate(assignmentValidation.getSubmissions),
    assignmentController.getAssignmentSubmissions
);

/**
 * @route   GET /api/v1/assignments/:id/stats
 * @desc    Get assignment statistics
 * @access  Trainer
 */
router.get(
    '/:id/stats',
    authMiddleware,
    isTrainer,
    validate(assignmentValidation.getStats),
    assignmentController.getAssignmentStats
);

// ==========================================
// STUDENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/assignments/student/my-assignments
 * @desc    Get all assignments for student
 * @access  Student
 */
router.get(
    '/student/my-assignments',
    authMiddleware,
    isStudent,
    validate(assignmentValidation.studentList),
    assignmentController.getStudentAssignments
);

/**
 * @route   GET /api/v1/assignments/student/:id
 * @desc    Get assignment details for student
 * @access  Student
 */
router.get(
    '/student/:id',
    authMiddleware,
    isStudent,
    validate(assignmentValidation.getById),
    assignmentController.getStudentAssignmentById
);

/**
 * @route   POST /api/v1/assignments/:id/submit
 * @desc    Submit assignment
 * @access  Student
 */
router.post(
    '/:id/submit',
    authMiddleware,
    isStudent,
    uploadMiddleware.single('file'),
    validate(assignmentValidation.submit),
    assignmentController.submitAssignment
);

/**
 * @route   GET /api/v1/assignments/:id/my-submission
 * @desc    Get student's submission for an assignment
 * @access  Student
 */
router.get(
    '/:id/my-submission',
    authMiddleware,
    isStudent,
    validate(assignmentValidation.getById),
    assignmentController.getStudentSubmission
);

// ==========================================
// SHARED ROUTES (Trainer & Admin)
// ==========================================

/**
 * @route   GET /api/v1/assignments/internship/:internshipId
 * @desc    Get all assignments for an internship
 * @access  Trainer/Admin
 */
router.get(
    '/internship/:internshipId',
    authMiddleware,
    isTrainerOrAdmin,
    validate(assignmentValidation.getByInternship),
    assignmentController.getAssignmentsByInternship
);


module.exports = router;