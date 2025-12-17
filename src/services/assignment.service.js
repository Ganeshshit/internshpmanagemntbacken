// src/services/assignment.service.js
const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const Internship = require('../models/internship.model');
const InternshipEnrollment = require('../models/enrollment.model');
const { AppError } = require('../middlewares/error.middleware');
const fileUtil = require('../utils/file.util');
const DateUtil = require('../utils/date.util');
const { uploadToCloudinary } = require('../utils/cloudinary.util');

const assignmentService = {
    // ==========================================
    // TRAINER SERVICES
    // ==========================================

    /**
     * Create new assignment
     */
    async createAssignment(data, trainerId, files) {
        const { internshipId, ...assignmentData } = data;

        const internship = await Internship.findById(internshipId);
        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        if (internship.trainerId.toString() !== trainerId.toString()) {
            throw new AppError('You can only create assignments for your internships', 403);
        }

        if (internship.status !== 'active') {
            throw new AppError('Cannot create assignment for inactive internship', 400);
        }

        const attachments = [];

        if (files && files.length > 0) {
            for (const file of files) {
                const uploaded = await uploadToCloudinary(file.buffer, {
                    folder: 'internships/assignments',
                });

                attachments.push({
                    fileName: file.originalname,
                    fileUrl: uploaded.secure_url, // ✅ Cloudinary URL
                    fileSize: file.size,
                });
            }
        }

        const assignment = new Assignment({
            ...assignmentData,
            internshipId,
            createdBy: trainerId,
            attachments,
        });

        if (assignmentData.status === 'published') {
            assignment.publishedAt = new Date();
        }

        await assignment.save();

        return assignment.populate([
            { path: 'internshipId', select: 'title' },
            { path: 'createdBy', select: 'name email' },
        ]);
    },


    /**
     * Get all assignments created by trainer
     */
    async getTrainerAssignments(trainerId, filters = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            type,
            internshipId,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = filters;

        const query = { createdBy: trainerId };

        // Apply filters
        if (status) query.status = status;
        if (type) query.type = type;
        if (internshipId) query.internshipId = internshipId;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [assignments, total] = await Promise.all([
            Assignment.find(query)
                .populate('internshipId', 'title status')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Assignment.countDocuments(query),
        ]);

        // Add submission count to each assignment
        const assignmentsWithStats = await Promise.all(
            assignments.map(async (assignment) => {
                const submissionCount = await Submission.countDocuments({
                    assignmentId: assignment._id,
                });
                return {
                    ...assignment,
                    submissionCount,
                    isOverdue: new Date() > assignment.dueDate && assignment.status === 'published',
                };
            })
        );

        return {
            assignments: assignmentsWithStats,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
            },
        };
    },

    /**
     * Get assignment by ID
     */
    async getAssignmentById(assignmentId, userId, userRole) {
        const assignment = await Assignment.findById(assignmentId)
            .populate('internshipId', 'title status startDate endDate')
            .populate('createdBy', 'name email');

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check permissions
        if (userRole === 'trainer') {
            if (assignment.createdBy._id.toString() !== userId.toString()) {
                throw new AppError('Access denied', 403);
            }
        }

        // Get submission stats
        const stats = await assignment.getSubmissionStats();

        return {
            ...assignment.toObject(),
            stats,
        };
    },

    /**
     * Update assignment
     */
    async updateAssignment(assignmentId, data, trainerId, files) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('You can only update your own assignments', 403);
        }

        // Prevent update if assignment is closed
        if (assignment.status === 'closed') {
            throw new AppError('Cannot update closed assignment', 400);
        }

        // Process new file attachments
        if (files && files.length > 0) {
            const newAttachments = [];
            for (const file of files) {
                const fileData = await fileUtil.saveFile(file, 'assignments');
                newAttachments.push({
                    fileName: file.originalname,
                    fileUrl: fileData.url,
                    fileSize: file.size,
                });
            }
            assignment.attachments = [...assignment.attachments, ...newAttachments];
        }

        // Update fields
        Object.keys(data).forEach((key) => {
            if (data[key] !== undefined) {
                assignment[key] = data[key];
            }
        });

        await assignment.save();

        return await assignment.populate([
            { path: 'internshipId', select: 'title' },
            { path: 'createdBy', select: 'name email' },
        ]);
    },

    /**
     * Delete assignment
     */
    async deleteAssignment(assignmentId, trainerId) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('You can only delete your own assignments', 403);
        }

        // Check if there are submissions
        const submissionCount = await Submission.countDocuments({
            assignmentId,
        });

        if (submissionCount > 0) {
            throw new AppError(
                'Cannot delete assignment with existing submissions',
                400
            );
        }

        // Delete attachment files
        if (assignment.attachments && assignment.attachments.length > 0) {
            for (const attachment of assignment.attachments) {
                await fileUtil.deleteFile(attachment.fileUrl);
            }
        }

        await assignment.deleteOne();
    },

    /**
     * Publish assignment
     */
    async publishAssignment(assignmentId, trainerId) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        if (assignment.status === 'published') {
            throw new AppError('Assignment is already published', 400);
        }

        if (assignment.status === 'closed') {
            throw new AppError('Cannot publish closed assignment', 400);
        }

        // Validate due date
        if (DateUtil.isPast(assignment.dueDate)) {
            throw new AppError('Cannot publish assignment with past due date', 400);
        }

        await assignment.publish();

        return assignment;
    },

    /**
     * Close assignment
     */
    async closeAssignment(assignmentId, trainerId) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        if (assignment.status === 'closed') {
            throw new AppError('Assignment is already closed', 400);
        }

        if (assignment.status === 'draft') {
            throw new AppError('Cannot close unpublished assignment', 400);
        }

        await assignment.close();

        return assignment;
    },
    /**
         * Submit assignment
         */
    async submitAssignment(assignmentId, studentId, data, file) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check if assignment is published
        if (assignment.status !== 'published') {
            throw new AppError('Assignment is not accepting submissions', 400);
        }

        // Check if student is enrolled
        const enrollment = await InternshipEnrollment.findOne({
            studentId,
            internshipId: assignment.internshipId,
            status: 'active',
        });

        if (!enrollment) {
            throw new AppError('You are not enrolled in this internship', 403);
        }

        // Check if already submitted
        const existingSubmission = await Submission.findOne({
            assignmentId,
            studentId,
        });

        if (existingSubmission) {
            throw new AppError('You have already submitted this assignment', 400);
        }

        // Check due date and late submission
        const isLate = DateUtil.isLateSubmission(new Date(), assignment.dueDate);
        if (isLate && !assignment.allowLateSubmission) {
            throw new AppError('Assignment deadline has passed', 400);
        }

        // Process submission based on type
        const submissionData = {
            assignmentId,
            studentId,
            submissionType: data.submissionType,
            isLate,
        };

        if (data.submissionType === 'pdf') {
            if (!file) {
                throw new AppError('PDF file is required', 400);
            }

            // Validate file type
            if (file.mimetype !== 'application/pdf') {
                throw new AppError('Only PDF files are allowed', 400);
            }

            const fileData = await fileUtil.saveFile(file, 'submissions');
            submissionData.fileUrl = fileData.url;
            submissionData.fileName = file.originalname;
            submissionData.fileSize = file.size;
        } else if (data.submissionType === 'text') {
            if (!data.textContent) {
                throw new AppError('Text content is required', 400);
            }
            submissionData.textContent = data.textContent;
        }

        const submission = new Submission(submissionData);
        await submission.save();

        return await submission.populate('studentId', 'name email');
    },
    /**
     * Get all submissions for an assignment
     */
    async getAssignmentSubmissions(assignmentId, trainerId, filters = {}) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        const {
            page = 1,
            limit = 10,
            status,
            isLate,
            evaluated,
        } = filters;

        const query = { assignmentId };

        // Apply filters
        if (status) query.status = status;
        if (isLate !== undefined) query.isLate = isLate === 'true';
        if (evaluated !== undefined) {
            query.marks = evaluated === 'true' ? { $ne: null } : null;
        }

        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            Submission.find(query)
                .populate('studentId', 'name email')
                .populate('evaluatedBy', 'name')
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Submission.countDocuments(query),
        ]);

        return {
            submissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
            },
        };
    },

    // Get assignments by internship for trainer or student
    async getAssignmentsByInternship(internshipId, userId, userRole, filters = {}) {
        const internship = await Internship.findById(internshipId);

        if (!internship) {
            throw new AppError('Internship not found', 404);
        }

        // Check permissions
        if (userRole === 'trainer') {
            if (internship.trainerId.toString() !== userId.toString()) {
                throw new AppError('Access denied', 403);
            }
        }

        const query = { internshipId };

        // Apply filters
        if (filters.status) query.status = filters.status;
        if (filters.type) query.type = filters.type;

        const assignments = await Assignment.find(query)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        return assignments;
    },


    /**
         * Get all assignments for student
         */
    async getStudentAssignments(studentId, filters = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            type,
            internshipId,
            submitted,
            overdue,
        } = filters;

        // Get student's enrolled internships
        const enrollments = await InternshipEnrollment.find({
            studentId,
            status: 'active',
        }).select('internshipId');

        const internshipIds = enrollments.map((e) => e.internshipId);

        const query = {
            internshipId: { $in: internshipIds },
            status: 'published',
        };

        // Apply filters
        if (status && status === 'closed') query.status = 'closed';
        if (type) query.type = type;
        if (internshipId) query.internshipId = internshipId;
        if (overdue === 'true') {
            query.dueDate = { $lt: new Date() };
        }

        const skip = (page - 1) * limit;

        const [assignments, total] = await Promise.all([
            Assignment.find(query)
                .populate('internshipId', 'title')
                .populate('createdBy', 'name')
                .sort({ dueDate: 1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Assignment.countDocuments(query),
        ]);

        // Check submission status for each assignment
        const assignmentsWithStatus = await Promise.all(
            assignments.map(async (assignment) => {
                const submission = await Submission.findOne({
                    assignmentId: assignment._id,
                    studentId,
                });

                return {
                    ...assignment,
                    hasSubmitted: !!submission,
                    submission: submission ? {
                        id: submission._id,
                        submittedAt: submission.submittedAt,
                        status: submission.status,
                        marks: submission.marks,
                        isLate: submission.isLate,
                    } : null,
                    isOverdue: new Date() > assignment.dueDate,
                };
            })
        );

        // Apply submitted filter if provided
        let filteredAssignments = assignmentsWithStatus;
        if (submitted !== undefined) {
            filteredAssignments = assignmentsWithStatus.filter(
                (a) => a.hasSubmitted === (submitted === 'true')
            );
        }

        return {
            assignments: filteredAssignments,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
            },
        };
    },
    async getStudentAssignmentById(assignmentId, studentId) {
        const assignment = await Assignment.findById(assignmentId)
            .populate('internshipId', 'title status')
            .populate('createdBy', 'name email');

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check if student is enrolled in the internship
        const enrollment = await InternshipEnrollment.findOne({
            studentId,
            internshipId: assignment.internshipId,
            status: 'active',
        });

        if (!enrollment) {
            throw new AppError('You are not enrolled in this internship', 403);
        }

        // Check if assignment is published
        if (assignment.status !== 'published' && assignment.status !== 'closed') {
            throw new AppError('Assignment is not available', 400);
        }

        // Get student's submission if exists
        const submission = await Submission.findOne({
            assignmentId,
            studentId,
        });

        return {
            ...assignment.toObject(),
            hasSubmitted: !!submission,
            submission,
            isOverdue: assignment.isOverdue,
            canSubmit:
                assignment.status === 'published' &&
                (!assignment.isOverdue || assignment.allowLateSubmission),
        };
    },

    /**
     * Get assignment statistics
     */
    async getAssignmentStats(assignmentId, trainerId) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        // Check ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        const stats = await assignment.getSubmissionStats();

        // Additional stats
        const lateSubmissions = await Submission.countDocuments({
            assignmentId,
            isLate: true,
        });

        const avgMarks = await Submission.aggregate([
            { $match: { assignmentId: assignment._id, marks: { $ne: null } } },
            { $group: { _id: null, average: { $avg: '$marks' } } },
        ]);

        return {
            ...stats,
            lateSubmissions,
            averageMarks: avgMarks[0]?.average || 0,
            dueDate: assignment.dueDate,
            isOverdue: assignment.isOverdue,
        };
    },


    /**
     * Get student's submission for an assignment
     */
    async getStudentSubmission(assignmentId, studentId) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        const submission = await Submission.findOne({
            assignmentId,
            studentId,
        })
            .populate('assignmentId', 'title totalMarks passingMarks')
            .populate('evaluatedBy', 'name');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        return submission;
    },
    // Continue in next message...
};
module.exports = assignmentService;