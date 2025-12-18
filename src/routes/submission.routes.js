// src/routes/submission.routes.js
const express = require('express');
const submissionController = require('../controllers/submission.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isTrainer, isStudent, isTrainerOrAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const submissionValidation = require('../validations/submission.validation');
const uploadMiddleware = require('../middlewares/upload.middleware');

const router = express.Router();

// ==========================================
// TRAINER ROUTES
// ==========================================

/**
 * @route   GET /api/v1/submissions/:id
 * @desc    Get submission by ID (Trainer)
 * @access  Trainer
 */
router.get(
    '/:id',
    authMiddleware,
    isTrainer,
    validate(submissionValidation.getById),
    submissionController.getSubmissionById
);

/**
 * @route   PUT /api/v1/submissions/:id/evaluate
 * @desc    Evaluate submission
 * @access  Trainer
 */
router.put(
    '/:id/evaluate',
    authMiddleware,
    isTrainer,
    validate(submissionValidation.evaluate),
    submissionController.evaluateSubmission
);

/**
 * @route   PUT /api/v1/submissions/:id/request-resubmit
 * @desc    Request resubmission from student
 * @access  Trainer
 */
router.put(
    '/:id/request-resubmit',
    authMiddleware,
    isTrainer,
    validate(submissionValidation.requestResubmit),
    submissionController.requestResubmission
);

/**
 * @route   GET /api/v1/submissions/assignment/:assignmentId
 * @desc    Get all submissions for an assignment
 * @access  Trainer
 */
router.get(
    '/assignment/:assignmentId',
    authMiddleware,
    isTrainer,
    validate(submissionValidation.getByAssignment),
    submissionController.getSubmissionsByAssignment
);

/**
 * @route   DELETE /api/v1/submissions/:id
 * @desc    Delete submission (Admin only or specific cases)
 * @access  Trainer/Admin
 */
router.delete(
    '/:id',
    authMiddleware,
    isTrainerOrAdmin,
    validate(submissionValidation.delete),
    submissionController.deleteSubmission
);

// ==========================================
// STUDENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/submissions/my-submissions
 * @desc    Get all submissions by student
 * @access  Student
 */
router.get(
    '/my-submissions',
    authMiddleware,
    isStudent,
    validate(submissionValidation.getMySubmissions),
    submissionController.getMySubmissions
);

/**
 * @route   GET /api/v1/submissions/student/:id
 * @desc    Get student's own submission by ID
 * @access  Student
 */
router.get(
    '/student/:id',
    authMiddleware,
    isStudent,
    validate(submissionValidation.getById),
    submissionController.getStudentSubmissionById
);

/**
 * @route   PUT /api/v1/submissions/:id/resubmit
 * @desc    Resubmit assignment (if allowed)
 * @access  Student
 */
router.put(
    '/:id/resubmit',
    authMiddleware,
    isStudent,
    uploadMiddleware.single('file'),
    validate(submissionValidation.resubmit),
    submissionController.resubmitAssignment
);

module.exports = router;