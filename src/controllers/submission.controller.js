// src/controllers/submission.controller.js
const submissionService = require('../services/submission.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler } = require('../middlewares/error.middleware');

const submissionController = {
    // ==========================================
    // TRAINER CONTROLLERS
    // ==========================================

    /**
     * Get submission by ID (for evaluation)
     */
    getSubmissionById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;

        const submission = await submissionService.getSubmissionForEvaluation(
            id,
            trainerId
        );

        return ApiResponse.success(
            res,
            submission,
            'Submission retrieved successfully'
        );
    }),

    /**
     * Evaluate submission and assign marks
     */
    evaluateSubmission: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;
        const evaluationData = req.body;

        const submission = await submissionService.evaluateSubmission(
            id,
            trainerId,
            evaluationData
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
        const trainerId = req.user.userId;
        const { feedback } = req.body;

        const submission = await submissionService.requestResubmission(
            id,
            trainerId,
            feedback
        );

        return ApiResponse.success(
            res,
            submission,
            'Resubmission requested successfully'
        );
    }),

    /**
     * Bulk evaluate multiple submissions
     */
    bulkEvaluate: asyncHandler(async (req, res) => {
        const trainerId = req.user.userId;
        const { submissions } = req.body;

        const result = await submissionService.bulkEvaluateSubmissions(
            trainerId,
            submissions
        );

        return ApiResponse.success(
            res,
            result,
            `Successfully evaluated ${result.successCount} submissions`
        );
    }),

    /**
     * Export submissions as CSV/Excel
     */
    exportSubmissions: asyncHandler(async (req, res) => {
        const { assignmentId } = req.params;
        const trainerId = req.user.userId;
        const { format = 'csv' } = req.query;

        const fileBuffer = await submissionService.exportSubmissions(
            assignmentId,
            trainerId,
            format
        );

        const filename = `submissions_${assignmentId}_${Date.now()}.${format}`;

        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        return res.send(fileBuffer);
    }),

    // ==========================================
    // STUDENT CONTROLLERS
    // ==========================================

    /**
     * Get all student's submissions
     */
    getMySubmissions: asyncHandler(async (req, res) => {
        const studentId = req.user.userId;
        const filters = req.query;

        const result = await submissionService.getStudentSubmissions(
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
     * Resubmit assignment (if allowed)
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