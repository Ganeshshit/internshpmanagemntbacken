// src/controllers/internship.controller.js
// HTTP layer for internship management

const internshipService = require('../services/internship.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler } = require('../middlewares/error.middleware');

const internshipController = {
    /**
     * Create new internship
     * POST /api/v1/internships
     * Access: Trainer, Admin
     */
    createInternship: asyncHandler(async (req, res) => {
        const internshipData = {
            ...req.body,
            trainerId: req.body.trainerId || req.user.userId,
        };

        const internship = await internshipService.createInternship(internshipData, req.user);

        return ApiResponse.created(
            res,
            internship,
            'Internship created successfully'
        );
    }),

    /**
     * Update internship
     * PUT /api/v1/internships/:id
     * Access: Trainer (owner), Admin
     */
    updateInternship: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        const internship = await internshipService.updateInternship(
            id,
            updateData,
            req.user
        );

        return ApiResponse.success(
            res,
            internship,
            'Internship updated successfully'
        );
    }),

    /**
     * Delete internship
     * DELETE /api/v1/internships/:id
     * Access: Admin only
     */
    deleteInternship: asyncHandler(async (req, res) => {
        const { id } = req.params;

        await internshipService.deleteInternship(id, req.user);

        return ApiResponse.success(
            res,
            null,
            'Internship deleted successfully'
        );
    }),

    /**
     * Get single internship by ID
     * GET /api/v1/internships/:id
     * Access: All authenticated users
     */
    getInternshipById: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const internship = await internshipService.getInternshipById(id, req.user);

        return ApiResponse.success(
            res,
            internship,
            'Internship retrieved successfully'
        );
    }),

    /**
     * Get all internships (role-based filtering)
     * GET /api/v1/internships
     * Access: All authenticated users
     */
    getAllInternships: asyncHandler(async (req, res) => {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            status: req.query.status,
            search: req.query.search,
            trainerId: req.query.trainerId,
        };

        const result = await internshipService.getAllInternships(filters, req.user);

        return ApiResponse.paginated(
            res,
            result.internships,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
            'Internships retrieved successfully'
        );
    }),

    /**
     * Get trainer's internships
     * GET /api/v1/internships/trainer/all
     * Access: Trainer, Admin
     */

    getTrainerInternships: asyncHandler(async (req, res) => {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            status: req.query.status,
            search: req.query.search,
        };

        const result = await internshipService.getTrainerInternships(
            req.user.userId,   // ✅ CORRECT
            filters,
            req.user
        );

        return ApiResponse.paginated(
            res,
            result.internships,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
            'Trainer internships retrieved successfully'
        );
    }),

    /**
     * Get student's enrolled internships
     * GET /api/v1/internships/student/my-internships
     * Access: Student
     */
    getStudentInternships: asyncHandler(async (req, res) => {
        const result = await internshipService.getStudentInternships(req.user.userId);

        return ApiResponse.success(
            res,
            result,
            'Student internships retrieved successfully'
        );
    }),

    /**
     * Enroll student in internship
     * POST /api/v1/internships/:id/enroll
     * Access: Trainer, Admin
     */
    enrollStudent: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { studentId } = req.body;

        const enrollment = await internshipService.enrollStudent(
            id,
            studentId,
            req.user
        );

        return ApiResponse.created(
            res,
            enrollment,
            'Student enrolled successfully'
        );
    }),

    /**
     * Unenroll student from internship
     * DELETE /api/v1/internships/:internshipId/students/:studentId
     * Access: Trainer, Admin
     */
    unenrollStudent: asyncHandler(async (req, res) => {
        const { internshipId, studentId } = req.params;

        await internshipService.unenrollStudent(
            internshipId,
            studentId,
            req.user
        );

        return ApiResponse.success(
            res,
            null,
            'Student unenrolled successfully'
        );
    }),

    /**
     * Get enrolled students for internship
     * GET /api/v1/internships/:id/students
     * Access: Trainer, Admin
     */
    getEnrolledStudents: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            status: req.query.status,
        };

        const result = await internshipService.getEnrolledStudents(
            id,
            filters,
            req.user
        );

        return ApiResponse.paginated(
            res,
            result.students,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
            'Enrolled students retrieved successfully'
        );
    }),
};

module.exports = internshipController;