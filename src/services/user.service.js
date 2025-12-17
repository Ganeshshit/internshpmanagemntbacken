// src/services/user.service.js
// User service - Business logic layer

const User = require('../models/user.model');
const Session = require('../models/session.model');
const { AppError } = require('../middlewares/error.middleware');
const PasswordUtil = require('../utils/password.util');

const userService = {
    /**
     * Get user by ID
     * @param {String} userId - User ID
     * @returns {Object} User object
     */
    async getUserById(userId) {
        const user = await User.findById(userId).select('-password');
        return user;
    },

    /**
     * Get user by email
     * @param {String} email - User email
     * @returns {Object} User object
     */
    async getUserByEmail(email) {
        const user = await User.findOne({ email }).select('+password');
        return user;
    },

    /**
     * Get all users with pagination and filters
     * @param {Object} options - Query options
     * @returns {Object} Paginated users
     */
    async getAllUsers(options = {}) {
        const {
            page = 1,
            limit = 10,
            role,
            status,
            search,
        } = options;

        const query = {};

        // Build query
        if (role) query.role = role;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        return {
            users,
            page,
            limit,
            total,
        };
    },

    /**
     * Get users by role
     * @param {String} role - User role
     * @param {Object} options - Query options
     * @returns {Object} Paginated users
     */
    async getUsersByRole(role, options = {}) {
        return this.getAllUsers({ ...options, role });
    },

    /**
     * Create new user
     * @param {Object} userData - User data
     * @returns {Object} Created user
     */
    async createUser(userData) {
        const { email, password } = userData;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Email already registered', 409);
        }

        // Hash password
        const hashedPassword = await PasswordUtil.hashPassword(password);

        // Create user
        const user = await User.create({
            ...userData,
            password: hashedPassword,
        });

        // Return user without password
        return user.toSafeObject();
    },

    /**
     * Update user profile (non-admin)
     * @param {String} userId - User ID
     * @param {Object} updateData - Update data
     * @returns {Object} Updated user
     */
    async updateUserProfile(userId, updateData) {
        const { name, email, phone, profileImage } = updateData;

        // Check if email is being changed
        if (email) {
            const existingUser = await User.findOne({
                email,
                _id: { $ne: userId },
            });

            if (existingUser) {
                throw new AppError('Email already in use', 409);
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    ...(name && { name }),
                    ...(email && { email }),
                    ...(phone !== undefined && { phone }),
                    ...(profileImage !== undefined && { profileImage }),
                },
            },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    },

    /**
     * Update user (admin)
     * @param {String} userId - User ID
     * @param {Object} updateData - Update data
     * @returns {Object} Updated user
     */
    async updateUser(userId, updateData) {
        const { email, password } = updateData;

        // Check if email is being changed
        if (email) {
            const existingUser = await User.findOne({
                email,
                _id: { $ne: userId },
            });

            if (existingUser) {
                throw new AppError('Email already in use', 409);
            }
        }

        // Hash password if provided
        if (password) {
            updateData.password = await PasswordUtil.hashPassword(password);
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    },

    /**
     * Update password
     * @param {String} userId - User ID
     * @param {String} currentPassword - Current password
     * @param {String} newPassword - New password
     */
    async updatePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId).select('+password');

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Verify current password
        const isPasswordValid = await PasswordUtil.comparePassword(
            currentPassword,
            user.password
        );

        if (!isPasswordValid) {
            throw new AppError('Current password is incorrect', 401);
        }

        // Hash new password
        const hashedPassword = await PasswordUtil.hashPassword(newPassword);

        // Update password
        user.password = hashedPassword;
        user.passwordChangedAt = Date.now();
        await user.save();

        // Invalidate all sessions except current one
        await Session.updateMany(
            { userId: user._id },
            { $set: { isRevoked: true } }
        );
    },

    /**
     * Delete user
     * @param {String} userId - User ID
     */
    async deleteUser(userId) {
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Clean up related data
        await Session.deleteMany({ userId });

        // TODO: Clean up related internships, assignments, etc.
        // This will be implemented when those modules are created
    },

    /**
     * Toggle user status (active/inactive)
     * @param {String} userId - User ID
     * @returns {Object} Updated user
     */
    async toggleUserStatus(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        user.status = user.status === 'active' ? 'inactive' : 'active';
        await user.save();

        // If deactivating, revoke all sessions
        if (user.status === 'inactive') {
            await Session.updateMany(
                { userId },
                { $set: { isRevoked: true } }
            );
        }

        return user.toSafeObject();
    },

    /**
     * Get user stats
     * @param {String} userId - User ID
     * @returns {Object} User statistics
     */
    async getUserStats(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // TODO: Implement stats when other modules are ready
        // This will include:
        // - Total internships (for students)
        // - Attendance percentage
        // - Assignments submitted/pending
        // - Quiz scores
        // - etc.

        return {
            userId: user._id,
            name: user.name,
            role: user.role,
            // More stats will be added later
        };
    },

    /**
     * Search users
     * @param {String} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Array} Users
     */
    async searchUsers(searchTerm, options = {}) {
        const { role, status, limit = 10 } = options;

        const query = {
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
            ],
        };

        if (role) query.role = role;
        if (status) query.status = status;

        const users = await User.find(query)
            .select('-password')
            .limit(limit)
            .lean();

        return users;
    },

    /**
     * Count users by role
     * @returns {Object} User counts
     */
    async getUserCounts() {
        const [students, trainers, admins, active, inactive] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'trainer' }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ status: 'active' }),
            User.countDocuments({ status: 'inactive' }),
        ]);

        return {
            students,
            trainers,
            admins,
            total: students + trainers + admins,
            active,
            inactive,
        };
    },

    /**
     * Update last login time
     * @param {String} userId - User ID
     */
    async updateLastLogin(userId) {
        await User.findByIdAndUpdate(userId, {
            $set: { lastLogin: new Date() },
        });
    },
};

module.exports = userService;