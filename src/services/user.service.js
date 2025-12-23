// src/services/user.service.js
// User service - Business logic layer

const User = require('../models/user.model');
const Session = require('../models/session.model');
const { AppError } = require('../middlewares/error.middleware');
const PasswordUtil = require('../utils/password.util');
const emailService = require('./email.service');

const userService = {
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await User.findById(userId).select('-password');
        return user;
    },

    /**
     * Get user by email
     */
    async getUserByEmail(email) {
        const user = await User.findOne({ email }).select('+password');
        return user;
    },

    /**
     * Get all users with pagination and filters
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
     */
    async getUsersByRole(role, options = {}) {
        return this.getAllUsers({ ...options, role });
    },

    /**
     * Create new user
     */
    async createUser(userData) {
        const { email, password } = userData;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Email already registered', 409);
        }

        // Validate password
        if (!password || password.length < 8) {
            throw new AppError('Password must be at least 8 characters', 400);
        }

        // Store plain password for email
        const plainPassword = password;

        // Hash password
        const hashedPassword = await PasswordUtil.hashPassword(password);

        // Create user
        const user = await User.create({
            ...userData,
            password: hashedPassword,
            role: userData.role || 'student', // Default to student
        });

        // Send welcome email with credentials (non-blocking)
        emailService.sendWelcomeEmail(user, plainPassword)
            .then(result => {
                if (result.success) {
                    console.log(`Welcome email sent to ${user.email}`);
                } else {
                    console.error(`Failed to send welcome email to ${user.email}:`, result.error);
                }
            })
            .catch(err => {
                console.error('Email sending error:', err);
            });

        // Return user without password
        return user.toSafeObject();
    },

    /**
     * Update user profile (non-admin)
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
            if (password.length < 8) {
                throw new AppError('Password must be at least 8 characters', 400);
            }
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

        // Validate new password
        if (newPassword.length < 8) {
            throw new AppError('New password must be at least 8 characters', 400);
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
     */
    async deleteUser(userId) {
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Clean up related data
        await Session.deleteMany({ userId });

        // TODO: Clean up related internships, assignments, etc.
    },

    /**
     * Toggle user status (active/inactive)
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
     */
    async getUserStats(userId) {
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // TODO: Implement stats when other modules are ready
        return {
            userId: user._id,
            name: user.name,
            role: user.role,
        };
    },

    /**
     * Search users
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
     */
    async updateLastLogin(userId) {
        await User.findByIdAndUpdate(userId, {
            $set: { lastLogin: new Date() },
        });
    },
};

module.exports = userService;