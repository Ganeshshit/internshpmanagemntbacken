// src/controllers/user.controller.js
// User controller - HTTP layer

const userService = require('../services/user.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const StudentProfileService = require('../services/studentProfile.service');
const userController = {
    /**
     * Get current user profile
     * @route GET /api/v1/users/me
     * @access Private
     */
    getProfile: asyncHandler(async (req, res) => {
        const user = await userService.getUserById(req.user.userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return ApiResponse.success(
            res,
            user,
            'Profile retrieved successfully'
        );
    }),

    /**
     * Update current user profile
     * @route PUT /api/v1/users/me
     * @access Private
     */
    updateProfile: asyncHandler(async (req, res) => {
        const user = await userService.updateUserProfile(
            req.user.userId,
            req.body
        );

        return ApiResponse.success(
            res,
            user,
            'Profile updated successfully'
        );
    }),

    /**
     * Update current user password
     * @route PUT /api/v1/users/me/password
     * @access Private
     */
    updatePassword: asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            throw new AppError('Current and new password are required', 400);
        }

        if (newPassword.length < 8) {
            throw new AppError('Password must be at least 8 characters', 400);
        }

        await userService.updatePassword(
            req.user.userId,
            currentPassword,
            newPassword
        );

        return ApiResponse.success(
            res,
            null,
            'Password updated successfully'
        );
    }),

    /**
     * Get all users with pagination and filters
     * @route GET /api/v1/users
     * @access Admin
     */
    getAllUsers: asyncHandler(async (req, res) => {
        const { page, limit, role, status, search } = req.query;

        const result = await userService.getAllUsers({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            role,
            status,
            search,
        });

        return ApiResponse.paginated(
            res,
            result.users,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
            'Users retrieved successfully'
        );
    }),

    /**
     * Get user by ID
     * @route GET /api/v1/users/:id
     * @access Admin, Trainer
     */
    // getUserById: asyncHandler(async (req, res) => {

    //     const user = await userService.getUserById(req.params.id);

    //     if (!user) {
    //         throw new AppError('User not found', 404);
    //     }

    //     return ApiResponse.success(
    //         res,
    //         user,
    //         'User retrieved successfully'
    //     );
    // }),

    getUserById: asyncHandler(async (req, res) => {
        const profile = await StudentProfileService.getFullStudentProfile(
            req.params.id
        );

        if (!profile) {
            throw new AppError('User not found', 404);
        }

        return ApiResponse.success(
            res,
            profile,
            'Student profile retrieved successfully'
        );
    }),
    /**
     * Create new user
     * @route POST /api/v1/users
     * @access Admin
     */
    createUser: asyncHandler(async (req, res) => {
        const user = await userService.createUser(req.body);

        return ApiResponse.created(
            res,
            user,
            'User created successfully'
        );
    }),

    /**
     * Update user
     * @route PUT /api/v1/users/:id
     * @access Admin
     */
    updateUser: asyncHandler(async (req, res) => {
        const user = await userService.updateUser(req.params.id, req.body);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return ApiResponse.success(
            res,
            user,
            'User updated successfully'
        );
    }),

    /**
     * Delete user
     * @route DELETE /api/v1/users/:id
     * @access Admin
     */
    deleteUser: asyncHandler(async (req, res) => {
        await userService.deleteUser(req.params.id);

        return ApiResponse.success(
            res,
            null,
            'User deleted successfully'
        );
    }),

    /**
     * Toggle user status (active/inactive)
     * @route PATCH /api/v1/users/:id/status
     * @access Admin
     */
    toggleUserStatus: asyncHandler(async (req, res) => {
        const user = await userService.toggleUserStatus(req.params.id);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return ApiResponse.success(
            res,
            user,
            `User ${user.status === 'active' ? 'activated' : 'deactivated'} successfully`
        );
    }),

    /**
     * Get all students
     * @route GET /api/v1/users/students/list
     * @access Admin, Trainer
     */
    getStudents: asyncHandler(async (req, res) => {
        const { page, limit, status, search } = req.query;

        const result = await userService.getUsersByRole('student', {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            status,
            search,
        });

        return ApiResponse.paginated(
            res,
            result.users,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
            'Students retrieved successfully'
        );
    }),

    /**
     * Get all trainers
     * @route GET /api/v1/users/trainers/list
     * @access Admin
     */
    getTrainers: asyncHandler(async (req, res) => {
        const { page, limit, status, search } = req.query;

        const result = await userService.getUsersByRole('trainer', {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            status,
            search,
        });

        return ApiResponse.paginated(
            res,
            result.users,
            {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
            'Trainers retrieved successfully'
        );
    }),
};

module.exports = userController;