// src/controllers/submission.controller.js
const submissionService = require('../services/submission.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler } = require('../middlewares/error.middleware');

const submissionController = {
    // ==========================================
    // TRAINER CONTROLLERS
    // ==========================================

    /**
     * Get submission by ID (Trainer)
     */
    getSubmissionById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;
        const userRole = req.user.role;

        const submission = await submissionService.getSubmissionById(
            id,
            trainerId,
            userRole
        );

        return ApiResponse.success(
            res,
            submission,
            'Submission retrieved successfully'
        );
    }),

    /**
     * Evaluate submission
     */
    evaluateSubmission: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { marks, feedback } = req.body;
        const trainerId = req.user.userId;

        const submission = await submissionService.evaluateSubmission(
            id,
            marks,
            feedback,
            trainerId
        );

        return ApiResponse.success(
            res,
            submission,
            'Submission evaluated successfully'
        );
    }),

    /**
     * Request resubmission from student
     */
    requestResubmission: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { feedback } = req.body;
        const trainerId = req.user.userId;

        const submission = await submissionService.requestResubmission(
            id,
            feedback,
            trainerId
        );

        return ApiResponse.success(
            res,
            submission,
            'Resubmission requested successfully'
        );
    }),

    /**
     * Get all submissions for an assignment
     */
    getSubmissionsByAssignment: asyncHandler(async (req, res) => {
        const { assignmentId } = req.params;
        const trainerId = req.user.userId;
        const filters = req.query;

        const result = await submissionService.getSubmissionsByAssignment(
            assignmentId,
            trainerId,
            filters
        );

        return ApiResponse.paginated(
            res,
            result.submissions,
            result.pagination,
            'Submissions retrieved successfully'
        );
    }),

    /**
     * Delete submission
     */
    deleteSubmission: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        await submissionService.deleteSubmission(id, userId, userRole);

        return ApiResponse.success(
            res,
            null,
            'Submission deleted successfully'
        );
    }),

    // ==========================================
    // STUDENT CONTROLLERS
    // ==========================================

    /**
     * Get all submissions by student
     */
    getMySubmissions: asyncHandler(async (req, res) => {
        const studentId = req.user.userId;
        const filters = req.query;

        const result = await submissionService.getMySubmissions(
            studentId,
            filters
        );

        return ApiResponse.paginated(
            res,
            result.submissions,
            result.pagination,
            'Submissions retrieved successfully'
        );
    }),

    /**
     * Get student's own submission by ID
     */
    getStudentSubmissionById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const studentId = req.user.userId;

        const submission = await submissionService.getStudentSubmissionById(
            id,
            studentId
        );

        return ApiResponse.success(
            res,
            submission,
            'Submission retrieved successfully'
        );
    }),

    /**
     * Resubmit assignment
     */
    resubmitAssignment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const studentId = req.user.userId;
        const file = req.file;

        const submission = await submissionService.resubmitAssignment(
            id,
            studentId,
            req.body,
            file
        );

        return ApiResponse.success(
            res,
            submission,
            'Assignment resubmitted successfully'
        );
    }),
};

module.exports = submissionController; 