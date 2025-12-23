// src/services/internship.service.js
// Enhanced business logic with email notifications

const Internship = require('../models/internship.model');
const InternshipEnrollment = require('../models/enrollment.model');
const User = require('../models/user.model');
const { AppError } = require('../middlewares/error.middleware');
const { ROLES } = require('../constants/roles');
const emailService = require('./email.service');

const internshipService = {
    /**
     * Create new internship
     */
    async createInternship(data, currentUser) {
        if (data.trainerId) {
            const trainer = await User.findById(data.trainerId);
            if (!trainer || trainer.role !== ROLES.TRAINER) {
                throw new AppError('Invalid trainer', 400);
            }
        }

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

        if (
            currentUser.role === ROLES.TRAINER &&
            internship.trainerId.toString() !== currentUser.userId.toString()
        ) {
            throw new AppError('Not authorized to update this internship', 403);
        }

        if (updateData.startDate || updateData.endDate) {
            const startDate = updateData.startDate ? new Date(updateData.startDate) : internship.startDate;
            const endDate = updateData.endDate ? new Date(updateData.endDate) : internship.endDate;

            if (startDate >= endDate) {
                throw new AppError('End date must be after start date', 400);
            }
        }

        if (updateData.trainerId && internship.enrolledCount > 0) {
            throw new AppError('Cannot change trainer after students are enrolled', 400);
        }

        Object.assign(internship, updateData);
        await internship.save();

        return internship;
    },

    /**
     * Delete internship
     */
    async deleteInternship(id, currentUser) {
        const internship = await Internship.findById(id);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

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

        const query = {};

        if (currentUser.role === ROLES.TRAINER) {
            query.trainerId = currentUser.userId;
        } else if (currentUser.role === ROLES.STUDENT) {
            query.status = 'active';
        }

        if (status === 'upcoming') {
            query.startDate = { $gt: new Date() };
        } else if (status === 'ongoing') {
            query.startDate = { $lte: new Date() };
            query.endDate = { $gte: new Date() };
            query.status = 'active';
        } else if (status === 'completed') {
            query.status = 'completed';
        }

        if (trainerId && currentUser.role === ROLES.ADMIN) {
            query.trainerId = trainerId;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

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
        if (
            currentUser.role === ROLES.TRAINER &&
            trainerId.toString() !== currentUser.userId.toString()
        ) {
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
     * Enroll student in internship (WITH EMAIL NOTIFICATION)
     */
    // async enrollStudent(internshipId, studentId, currentUser) {
    //     // Validate internship exists
    //     const internship = await Internship.findById(internshipId).populate('trainerId', 'name email');
    //     if (!internship) {
    //         throw new AppError('Internship not found', 404);
    //     }

    //     // Validate student exists
    //     const student = await User.findById(studentId);
    //     if (!student || student.role !== ROLES.STUDENT) {
    //         throw new AppError('Invalid student', 400);
    //     }

    //     // Check if internship is active
    //     if (internship.status !== 'active') {
    //         throw new AppError('Internship is not active', 400);
    //     }

    //     // Check if seats available
    //     if (!internship.hasAvailableSeats()) {
    //         throw new AppError('No seats available', 400);
    //     }

    //     // Check if already enrolled
    //     const existingEnrollment = await InternshipEnrollment.findOne({
    //         internshipId,
    //         studentId,
    //     });

    //     if (existingEnrollment) {
    //         throw new AppError('Student already enrolled in this internship', 409);
    //     }

    //     // Authorization check for trainers
    //     if (
    //         currentUser.role === ROLES.TRAINER &&
    //         internship.trainerId._id.toString() !== currentUser.userId.toString()
    //     ) {
    //         throw new AppError('Not authorized to enroll students in this internship', 403);
    //     }

    //     // Create enrollment
    //     const enrollment = await InternshipEnrollment.create({
    //         internshipId,
    //         studentId,
    //         status: 'active',
    //     });

    //     // Update enrolled count
    //     internship.enrolledCount += 1;
    //     await internship.save();

    //     // Send enrollment notification email (async, don't block the response)
    //     emailService.sendEnrollmentNotification(
    //         student,
    //         internship.toObject(),
    //         internship.trainerId
    //     ).catch(error => {
    //         console.error('Failed to send enrollment email:', error);
    //         // Don't throw error - enrollment succeeded even if email fails
    //     });

    //     return enrollment;
    // },



    async enrollStudent(internshipId, studentId, currentUser) {
        // 1️⃣ Validate internship exists
        const internship = await Internship.findById(internshipId)
            .populate('trainerId', 'name email');

        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // 2️⃣ ❗ Only status rule: block if completed
        if (internship.status === 'completed') {
            throw new AppError(
                'Internship is completed. Enrollment is no longer allowed.',
                400
            );
        }

        // 3️⃣ Validate student
        const student = await User.findById(studentId);
        if (!student || student.role !== ROLES.STUDENT) {
            throw new AppError('Invalid student', 400);
        }

        // 4️⃣ Authorization (trainer ownership)
        if (
            currentUser.role === ROLES.TRAINER &&
            internship.trainerId._id.toString() !== currentUser.userId.toString()
        ) {
            throw new AppError(
                'Not authorized to enroll students in this internship',
                403
            );
        }

        // 5️⃣ Seat availability check
        if (!internship.hasAvailableSeats()) {
            throw new AppError('No seats available', 400);
        }

        // 6️⃣ Prevent duplicate enrollment
        const existingEnrollment = await InternshipEnrollment.findOne({
            internshipId,
            studentId,
        });

        if (existingEnrollment) {
            throw new AppError(
                'Student already enrolled in this internship',
                409
            );
        }

        // 7️⃣ Create enrollment
        const enrollment = await InternshipEnrollment.create({
            internshipId,
            studentId,
            status: 'active',
        });

        // 8️⃣ Update count
        internship.enrolledCount += 1;
        await internship.save();

        // 9️⃣ Fire-and-forget email
        emailService
            .sendEnrollmentNotification(
                student,
                internship.toObject(),
                internship.trainerId
            )
            .catch(err =>
                console.error('Enrollment email failed:', err)
            );

        return enrollment;
    },

    /**
     * Unenroll student from internship (WITH EMAIL NOTIFICATION)
     */
    async unenrollStudent(internshipId, studentId, currentUser, reason = null) {
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

        // Get student info for email
        const student = await User.findById(studentId);

        // Delete enrollment
        await enrollment.deleteOne();

        // Update enrolled count
        if (internship.enrolledCount > 0) {
            internship.enrolledCount -= 1;
            await internship.save();
        }

        // Send unenrollment notification email (async)
        if (student) {
            emailService.sendUnenrollmentNotification(
                student,
                internship.toObject(),
                reason
            ).catch(error => {
                console.error('Failed to send unenrollment email:', error);
            });
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

    /**
     * Get available students (not enrolled in this internship)
     */
    async getAvailableStudents(internshipId, filters, currentUser) {
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

        const { page, limit, search } = filters;
        const skip = (page - 1) * limit;

        // Get all enrolled student IDs for this internship
        const enrollments = await InternshipEnrollment.find({
            internshipId
        }).select('studentId').lean();

        const enrolledStudentIds = enrollments.map(e => e.studentId.toString());

        // Build query for available students
        const query = {
            role: ROLES.STUDENT,
            status: 'active',
            _id: { $nin: enrolledStudentIds },
        };

        // Add search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const [students, total] = await Promise.all([
            User.find(query)
                .select('name email phone')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query),
        ]);

        return {
            students,
            page,
            limit,
            total,
        };
    },

    /**
     * Bulk enroll students
     */
    async bulkEnrollStudents(internshipId, studentIds, currentUser) {
        const internship = await Internship.findById(internshipId).populate('trainerId', 'name email');
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Authorization check
        if (
            currentUser.role === ROLES.TRAINER &&
            internship.trainerId._id.toString() !== currentUser.userId.toString()
        ) {
            throw new AppError('Not authorized', 403);
        }

        if (internship.status !== 'active') {
            throw new AppError('Internship is not active', 400);
        }

        const results = {
            success: [],
            failed: [],
            alreadyEnrolled: [],
        };

        for (const studentId of studentIds) {
            try {
                // Check if already enrolled
                const existingEnrollment = await InternshipEnrollment.findOne({
                    internshipId,
                    studentId,
                });

                if (existingEnrollment) {
                    results.alreadyEnrolled.push(studentId);
                    continue;
                }

                // Check seats
                if (!internship.hasAvailableSeats()) {
                    results.failed.push({ studentId, reason: 'No seats available' });
                    break;
                }

                // Get student
                const student = await User.findById(studentId);
                if (!student || student.role !== ROLES.STUDENT) {
                    results.failed.push({ studentId, reason: 'Invalid student' });
                    continue;
                }

                // Create enrollment
                await InternshipEnrollment.create({
                    internshipId,
                    studentId,
                    status: 'active',
                });

                internship.enrolledCount += 1;
                await internship.save();

                results.success.push(studentId);

                // Send email notification (async)
                emailService.sendEnrollmentNotification(
                    student,
                    internship.toObject(),
                    internship.trainerId
                ).catch(error => {
                    console.error(`Failed to send enrollment email to ${student.email}:`, error);
                });

            } catch (error) {
                results.failed.push({ studentId, reason: error.message });
            }
        }

        return results;
    },
};

module.exports = internshipService;