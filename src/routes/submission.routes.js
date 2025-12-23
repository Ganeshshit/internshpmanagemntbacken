// src/routes/submission.routes.js
const express = require('express');
const submissionController = require('../controllers/submission.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { isTrainer, isStudent } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const submissionValidation = require('../validations/submission.validation');

const router = express.Router();

// ==========================================
// TRAINER ROUTES - Evaluation
// ==========================================

/**
 * @route   GET /api/v1/submissions/:id
 * @desc    Get submission by ID (for evaluation)
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
 * @desc    Evaluate submission and assign marks
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
 * @route   PUT /api/v1/submissions/:id/request-resubmission
 * @desc    Request resubmission from student
 * @access  Trainer
 */
router.put(
    '/:id/request-resubmission',
    authMiddleware,
    isTrainer,
    validate(submissionValidation.requestResubmission),
    submissionController.requestResubmission
);

/**
 * @route   POST /api/v1/submissions/bulk-evaluate
 * @desc    Bulk evaluate multiple submissions
 * @access  Trainer
 */
router.post(
    '/bulk-evaluate',
    authMiddleware,
    isTrainer,
    validate(submissionValidation.bulkEvaluate),
    submissionController.bulkEvaluate
);

/**
 * @route   GET /api/v1/submissions/assignment/:assignmentId/export
 * @desc    Export submissions as CSV/Excel
 * @access  Trainer
 */
router.get(
    '/assignment/:assignmentId/export',
    authMiddleware,
    isTrainer,
    submissionController.exportSubmissions
);

// ==========================================
// STUDENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/submissions/my-submissions
 * @desc    Get all student's submissions
 * @access  Student
 */
router.get(
    '/my-submissions',
    authMiddleware,
    isStudent,
    submissionController.getMySubmissions
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
    validate(submissionValidation.resubmit),
    submissionController.resubmitAssignment
);

module.exports = router;