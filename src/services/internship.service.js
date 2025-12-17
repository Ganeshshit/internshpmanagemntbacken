// src/services/internship.service.js
// Business logic for internship management

const Internship = require('../models/internship.model');
const InternshipEnrollment = require('../models/enrollment.model');
const User = require('../models/user.model');
const { AppError } = require('../middlewares/error.middleware');
const { ROLES } = require('../constants/roles');
const DateUtil = require('../utils/date.util');

const internshipService = {
    /**
     * Create new internship
     */
    async createInternship(data, currentUser) {
        // Validate trainer exists if trainerId provided
        if (data.trainerId) {
            const trainer = await User.findById(data.trainerId);
            if (!trainer || trainer.role !== ROLES.TRAINER) {
                throw new AppError('Invalid trainer', 400);
            }
        }

        // Validate dates
        if (new Date(data.startDate) >= new Date(data.endDate)) {
            throw new AppError('End date must be after start date', 400);
        }

        const internship = await Internship.create(data);
        return internship;
    },

    /**
     * Update internship
     */
    async updateInternship(id, updateData, currentUser) {
        const internship = await Internship.findById(id);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Authorization check
        if (
            currentUser.role === ROLES.TRAINER &&
            internship.trainerId.toString() !== currentUser.userId.toString()
        ) {
            throw new AppError('Not authorized to update this internship', 403);
        }

        // Validate dates if provided
        if (updateData.startDate || updateData.endDate) {
            const startDate = updateData.startDate ? new Date(updateData.startDate) : internship.startDate;
            const endDate = updateData.endDate ? new Date(updateData.endDate) : internship.endDate;

            if (startDate >= endDate) {
                throw new AppError('End date must be after start date', 400);
            }
        }

        // Don't allow changing trainerId after enrollments exist
        if (updateData.trainerId && internship.enrolledCount > 0) {
            throw new AppError('Cannot change trainer after students are enrolled', 400);
        }

        Object.assign(internship, updateData);
        await internship.save();

        return internship;
    },

    /**
     * Delete internship (soft delete by changing status)
     */
    async deleteInternship(id, currentUser) {
        const internship = await Internship.findById(id);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Check if there are active enrollments
        const activeEnrollments = await InternshipEnrollment.countDocuments({
            internshipId: id,
            status: 'active',
        });

        if (activeEnrollments > 0) {
            throw new AppError(
                'Cannot delete internship with active enrollments. Please complete or cancel enrollments first.',
                400
            );
        }

        // Soft delete - mark as cancelled
        internship.status = 'cancelled';
        await internship.save();

        return internship;
    },

    /**
     * Get single internship by ID
     */
    async getInternshipById(id, currentUser) {
        const internship = await Internship.findById(id)
            .populate('trainerId', 'name email')
            .lean();

        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // If student, check if they're enrolled
        if (currentUser.role === ROLES.STUDENT) {
            const enrollment = await InternshipEnrollment.findOne({
                internshipId: id,
                studentId: currentUser.userId,
            });

            internship.isEnrolled = !!enrollment;
            internship.enrollmentStatus = enrollment?.status || null;
        }

        return internship;
    },

    /**
     * Get all internships with role-based filtering
     */
    async getAllInternships(filters, currentUser) {
        const { page, limit, status, search, trainerId } = filters;
        const skip = (page - 1) * limit;

        // Build query
        const query = {};

        // Role-based filtering
        if (currentUser.role === ROLES.TRAINER) {
            query.trainerId = currentUser.userId;
        } else if (currentUser.role === ROLES.STUDENT) {
            // Students only see active internships they can enroll in
            query.status = 'active';
        }

        // Status filter
        if (status === 'upcoming') {
            query.startDate = { $gt: new Date() };
        } else if (status === 'ongoing') {
            query.startDate = { $lte: new Date() };
            query.endDate = { $gte: new Date() };
            query.status = 'active';
        } else if (status === 'completed') {
            query.status = 'completed';
        }

        // Trainer filter (for admin)
        if (trainerId && currentUser.role === ROLES.ADMIN) {
            query.trainerId = trainerId;
        }

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        // Exclude cancelled internships for non-admins
        if (currentUser.role !== ROLES.ADMIN) {
            query.status = { $ne: 'cancelled' };
        }

        const [internships, total] = await Promise.all([
            Internship.find(query)
                .populate('trainerId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Internship.countDocuments(query),
        ]);

        // If student, add enrollment info
        if (currentUser.role === ROLES.STUDENT) {
            const internshipIds = internships.map((i) => i._id);
            const enrollments = await InternshipEnrollment.find({
                internshipId: { $in: internshipIds },
                studentId: currentUser.userId,
            }).lean();

            const enrollmentMap = {};
            enrollments.forEach((e) => {
                enrollmentMap[e.internshipId.toString()] = e;
            });

            internships.forEach((internship) => {
                const enrollment = enrollmentMap[internship._id.toString()];
                internship.isEnrolled = !!enrollment;
                internship.enrollmentStatus = enrollment?.status || null;
            });
        }

        return {
            internships,
            page,
            limit,
            total,
        };
    },

    /**
     * Get trainer's internships
     */
    async getTrainerInternships(trainerId, filters, currentUser) {
        // Trainers can only see their own internships unless admin
        if (currentUser.role === ROLES.TRAINER && trainerId !== currentUser.userId.toString()) {
            throw new AppError('Not authorized', 403);
        }

        const { page, limit, status, search } = filters;
        const skip = (page - 1) * limit;

        const query = { trainerId };

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const [internships, total] = await Promise.all([
            Internship.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Internship.countDocuments(query),
        ]);

        return {
            internships,
            page,
            limit,
            total,
        };
    },

    /**
     * Get student's enrolled internships
     */
    async getStudentInternships(studentId) {
        const enrollments = await InternshipEnrollment.find({ studentId })
            .populate({
                path: 'internshipId',
                populate: {
                    path: 'trainerId',
                    select: 'name email',
                },
            })
            .sort({ createdAt: -1 })
            .lean();

        const internships = enrollments.map((enrollment) => ({
            ...enrollment.internshipId,
            enrollmentStatus: enrollment.status,
            enrolledAt: enrollment.createdAt,
        }));

        return internships;
    },

    /**
     * Enroll student in internship
     */
    async enrollStudent(internshipId, studentId, currentUser) {
        // Validate internship exists
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Validate student exists
        const student = await User.findById(studentId);
        if (!student || student.role !== ROLES.STUDENT) {
            throw new AppError('Invalid student', 400);
        }

        // Check if internship is active
        if (internship.status !== 'active') {
            throw new AppError('Internship is not active', 400);
        }

        // Check if seats available
        if (!internship.hasAvailableSeats()) {
            throw new AppError('No seats available', 400);
        }

        // Check if already enrolled
        const existingEnrollment = await InternshipEnrollment.findOne({
            internshipId,
            studentId,
        });

        if (existingEnrollment) {
            throw new AppError('Student already enrolled in this internship', 409);
        }

        // Authorization check for trainers
        if (
            currentUser.role === ROLES.TRAINER &&
            internship.trainerId.toString() !== currentUser.userId.toString()
        ) {
            throw new AppError('Not authorized to enroll students in this internship', 403);
        }

        // Create enrollment
        const enrollment = await InternshipEnrollment.create({
            internshipId,
            studentId,
            status: 'active',
        });

        // Update enrolled count
        internship.enrolledCount += 1;
        await internship.save();

        return enrollment;
    },

    /**
     * Unenroll student from internship
     */
    async unenrollStudent(internshipId, studentId, currentUser) {
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Authorization check for trainers
        if (
            currentUser.role === ROLES.TRAINER &&
            internship.trainerId.toString() !== currentUser.userId.toString()
        ) {
            throw new AppError('Not authorized', 403);
        }

        const enrollment = await InternshipEnrollment.findOne({
            internshipId,
            studentId,
        });

        if (!enrollment) {
            throw new AppError('Enrollment not found', 404);
        }

        // Delete enrollment
        await enrollment.deleteOne();

        // Update enrolled count
        if (internship.enrolledCount > 0) {
            internship.enrolledCount -= 1;
            await internship.save();
        }

        return;
    },

    /**
     * Get enrolled students for internship
     */
    async getEnrolledStudents(internshipId, filters, currentUser) {
        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Authorization check for trainers
        if (
            currentUser.role === ROLES.TRAINER &&
            internship.trainerId.toString() !== currentUser.userId.toString()
        ) {
            throw new AppError('Not authorized', 403);
        }

        const { page, limit, status } = filters;
        const skip = (page - 1) * limit;

        const query = { internshipId };
        if (status) {
            query.status = status;
        }

        const [enrollments, total] = await Promise.all([
            InternshipEnrollment.find(query)
                .populate('studentId', 'name email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            InternshipEnrollment.countDocuments(query),
        ]);

        const students = enrollments.map((enrollment) => ({
            ...enrollment.studentId,
            enrollmentStatus: enrollment.status,
            enrolledAt: enrollment.createdAt,
        }));

        return {
            students,
            page,
            limit,
            total,
        };
    },
};

module.exports = internshipService;