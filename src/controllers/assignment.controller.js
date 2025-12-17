// src/controllers/assignment.controller.js
const assignmentService = require('../services/assignment.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler } = require('../middlewares/error.middleware');

const assignmentController = {
    // ==========================================
    // TRAINER CONTROLLERS
    // ==========================================

    /**
     * Create new assignment
     */
    createAssignment: asyncHandler(async (req, res) => {
        const trainerId = req.user.userId;
        const files = req.files || [];

        const assignment = await assignmentService.createAssignment(
            req.body,
            trainerId,
            files
        );

        return ApiResponse.created(
            res,
            assignment,
            'Assignment created successfully'
        );
    }),

    /**
     * Get all assignments created by trainer
     */
    getTrainerAssignments: asyncHandler(async (req, res) => {
        const trainerId = req.user.userId;
        const filters = req.query;

        const result = await assignmentService.getTrainerAssignments(
            trainerId,
            filters
        );

        return ApiResponse.paginated(
            res,
            result.assignments,
            result.pagination,
            'Assignments retrieved successfully'
        );
    }),

    /**
     * Get assignment by ID
     */
    getAssignmentById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        const assignment = await assignmentService.getAssignmentById(
            id,
            userId,
            userRole
        );

        return ApiResponse.success(
            res,
            assignment,
            'Assignment retrieved successfully'
        );
    }),

    /**
     * Update assignment
     */
    updateAssignment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;
        const files = req.files || [];

        const assignment = await assignmentService.updateAssignment(
            id,
            req.body,
            trainerId,
            files
        );

        return ApiResponse.success(
            res,
            assignment,
            'Assignment updated successfully'
        );
    }),

    /**
     * Delete assignment
     */
    deleteAssignment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;

        await assignmentService.deleteAssignment(id, trainerId);

        return ApiResponse.success(
            res,
            null,
            'Assignment deleted successfully'
        );
    }),

    /**
     * Publish assignment
     */
    publishAssignment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;

        const assignment = await assignmentService.publishAssignment(id, trainerId);

        return ApiResponse.success(
            res,
            assignment,
            'Assignment published successfully'
        );
    }),

    /**
     * Close assignment
     */
    closeAssignment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;

        const assignment = await assignmentService.closeAssignment(id, trainerId);

        return ApiResponse.success(
            res,
            assignment,
            'Assignment closed successfully'
        );
    }),

    /**
     * Get all submissions for an assignment
     */
    getAssignmentSubmissions: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;
        const filters = req.query;

        const result = await assignmentService.getAssignmentSubmissions(
            id,
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
     * Get assignment statistics
     */
    getAssignmentStats: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const trainerId = req.user.userId;

        const stats = await assignmentService.getAssignmentStats(id, trainerId);

        return ApiResponse.success(
            res,
            stats,
            'Statistics retrieved successfully'
        );
    }),

    /**
     * Get assignments by internship
     */
    getAssignmentsByInternship: asyncHandler(async (req, res) => {
        const { internshipId } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const filters = req.query;

        const assignments = await assignmentService.getAssignmentsByInternship(
            internshipId,
            userId,
            userRole,
            filters
        );

        return ApiResponse.success(
            res,
            assignments,
            'Assignments retrieved successfully'
        );
    }),

    // ==========================================
    // STUDENT CONTROLLERS
    // ==========================================

    /**
     * Get all assignments for student
     */
    getStudentAssignments: asyncHandler(async (req, res) => {
        const studentId = req.user.userId;
        const filters = req.query;

        const result = await assignmentService.getStudentAssignments(
            studentId,
            filters
        );

        return ApiResponse.paginated(
            res,
            result.assignments,
            result.pagination,
            'Assignments retrieved successfully'
        );
    }),

    /**
     * Get assignment details for student
     */
    getStudentAssignmentById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const studentId = req.user.userId;

        const assignment = await assignmentService.getStudentAssignmentById(
            id,
            studentId
        );

        return ApiResponse.success(
            res,
            assignment,
            'Assignment retrieved successfully'
        );
    }),

    /**
     * Submit assignment
     */
    submitAssignment: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const studentId = req.user.userId;
        const file = req.file;

        const submission = await assignmentService.submitAssignment(
            id,
            studentId,
            req.body,
            file
        );

        return ApiResponse.created(
            res,
            submission,
            'Assignment submitted successfully'
        );
    }),

    /**
     * Get student's submission for an assignment
     */
    getStudentSubmission: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const studentId = req.user.userId;

        const submission = await assignmentService.getStudentSubmission(
            id,
            studentId
        );

        return ApiResponse.success(
            res,
            submission,
            'Submission retrieved successfully'
        );
    }),
};

module.exports = assignmentController;