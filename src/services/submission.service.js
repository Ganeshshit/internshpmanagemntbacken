// src/services/submission.service.js
const Submission = require('../models/submission.model');
const Assignment = require('../models/assignment.model');
const { AppError } = require('../middlewares/error.middleware');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary.util');
const DateUtil = require('../utils/date.util');

const submissionService = {
    // ==========================================
    // TRAINER SERVICES
    // ==========================================

    /**
     * Get submission by ID (with ownership check)
     */
    async getSubmissionById(submissionId, userId, userRole) {
        const submission = await Submission.findById(submissionId)
            .populate('assignmentId', 'title type maxMarks dueDate')
            .populate('studentId', 'name email')
            .populate('evaluatedBy', 'name email');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Check permissions
        if (userRole === 'trainer') {
            const assignment = await Assignment.findById(submission.assignmentId);
            if (assignment.createdBy.toString() !== userId.toString()) {
                throw new AppError('Access denied', 403);
            }
        }

        // Add computed fields
        const submissionData = submission.toObject();

        return {
            ...submissionData,
            assignment: {
                _id: submission.assignmentId._id,
                title: submission.assignmentId.title,
                type: submission.assignmentId.type,
                maxMarks: submission.assignmentId.maxMarks,
                dueDate: submission.assignmentId.dueDate,
            },
            student: {
                _id: submission.studentId._id,
                name: submission.studentId.name,
                email: submission.studentId.email,
            },
            studentName: submission.studentId.name,
            studentEmail: submission.studentId.email,
        };
    },

    /**
     * Evaluate submission
     */
    async evaluateSubmission(submissionId, marks, feedback, trainerId) {
        const submission = await Submission.findById(submissionId)
            .populate('assignmentId');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Check assignment ownership
        const assignment = await Assignment.findById(submission.assignmentId);
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        // Validate marks
        if (marks > assignment.maxMarks) {
            throw new AppError(
                `Marks cannot exceed maximum marks (${assignment.maxMarks})`,
                400
            );
        }

        // Evaluate
        await submission.evaluate(marks, feedback, trainerId);

        return await submission.populate([
            { path: 'assignmentId', select: 'title maxMarks' },
            { path: 'studentId', select: 'name email' },
            { path: 'evaluatedBy', select: 'name' },
        ]);
    },

    /**
     * Request resubmission
     */
    async requestResubmission(submissionId, feedback, trainerId) {
        const submission = await Submission.findById(submissionId);

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Check assignment ownership
        const assignment = await Assignment.findById(submission.assignmentId);
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        // Check if assignment allows resubmission
        if (!assignment.allowResubmission) {
            throw new AppError('This assignment does not allow resubmission', 400);
        }

        // Request resubmission
        await submission.requestResubmission(feedback, trainerId);

        return await submission.populate([
            { path: 'assignmentId', select: 'title' },
            { path: 'studentId', select: 'name email' },
            { path: 'evaluatedBy', select: 'name' },
        ]);
    },

    /**
     * Get all submissions for an assignment
     */
    async getSubmissionsByAssignment(assignmentId, trainerId, filters = {}) {
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
            sortBy = 'submittedAt',
            sortOrder = 'desc',
        } = filters;

        const query = { assignmentId };

        // Apply filters
        if (status) query.status = status;
        if (isLate !== undefined) query.isLate = isLate === 'true';
        if (evaluated !== undefined) {
            query.marks = evaluated === 'true' ? { $ne: null } : null;
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [submissions, total] = await Promise.all([
            Submission.find(query)
                .populate('studentId', 'name email')
                .populate('evaluatedBy', 'name')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Submission.countDocuments(query),
        ]);

        // Add computed fields
        const enrichedSubmissions = submissions.map(sub => ({
            ...sub,
            studentName: sub.studentId?.name || 'Unknown',
            studentEmail: sub.studentId?.email || 'N/A',
            isEvaluated: sub.marks !== null,
        }));

        return {
            submissions: enrichedSubmissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Delete submission
     */
    async deleteSubmission(submissionId, userId, userRole) {
        const submission = await Submission.findById(submissionId);

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Only admin or assignment owner can delete
        if (userRole === 'trainer') {
            const assignment = await Assignment.findById(submission.assignmentId);
            if (assignment.createdBy.toString() !== userId.toString()) {
                throw new AppError('Access denied', 403);
            }
        }

        // Delete file from Cloudinary if exists
        if (submission.fileUrl) {
            try {
                await deleteFromCloudinary(submission.fileUrl);
            } catch (error) {
                console.error('Error deleting file from Cloudinary:', error);
            }
        }

        await submission.deleteOne();
    },

    // ==========================================
    // STUDENT SERVICES
    // ==========================================

    /**
     * Get all submissions by student
     */
    async getMySubmissions(studentId, filters = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            internshipId,
            sortBy = 'submittedAt',
            sortOrder = 'desc',
        } = filters;

        const query = { studentId };

        // Apply filters
        if (status) query.status = status;

        // If internshipId is provided, filter by assignment's internship
        let assignmentIds = [];
        if (internshipId) {
            const assignments = await Assignment.find({ internshipId }).select('_id');
            assignmentIds = assignments.map(a => a._id);
            query.assignmentId = { $in: assignmentIds };
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [submissions, total] = await Promise.all([
            Submission.find(query)
                .populate({
                    path: 'assignmentId',
                    select: 'title type maxMarks dueDate internshipId',
                    populate: {
                        path: 'internshipId',
                        select: 'title',
                    },
                })
                .populate('evaluatedBy', 'name')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Submission.countDocuments(query),
        ]);

        // Enrich data
        const enrichedSubmissions = submissions.map(sub => ({
            ...sub,
            assignmentTitle: sub.assignmentId?.title || 'Unknown',
            internshipTitle: sub.assignmentId?.internshipId?.title || 'Unknown',
            isEvaluated: sub.marks !== null,
            grade: this.calculateGrade(sub.marks, sub.assignmentId?.maxMarks),
        }));

        return {
            submissions: enrichedSubmissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    /**
     * Get student's own submission by ID
     */
    async getStudentSubmissionById(submissionId, studentId) {
        const submission = await Submission.findById(submissionId)
            .populate('assignmentId', 'title type maxMarks dueDate')
            .populate('evaluatedBy', 'name email');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Check ownership
        if (submission.studentId.toString() !== studentId.toString()) {
            throw new AppError('Access denied', 403);
        }

        return submission;
    },

    /**
     * Resubmit assignment
     */
    async resubmitAssignment(submissionId, studentId, data, file) {
        const submission = await Submission.findById(submissionId);

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Check ownership
        if (submission.studentId.toString() !== studentId.toString()) {
            throw new AppError('Access denied', 403);
        }

        // Check if resubmission is allowed
        if (submission.status !== 'resubmit_required') {
            throw new AppError('Resubmission not allowed for this submission', 400);
        }

        // Get assignment to check resubmission settings
        const assignment = await Assignment.findById(submission.assignmentId);
        if (!assignment.allowResubmission) {
            throw new AppError('This assignment does not allow resubmission', 400);
        }

        // Delete old file if exists
        if (submission.fileUrl) {
            try {
                await deleteFromCloudinary(submission.fileUrl);
            } catch (error) {
                console.error('Error deleting old file:', error);
            }
        }

        // Process new submission
        const updateData = {
            submissionType: data.submissionType,
            submittedAt: new Date(),
            status: 'submitted',
            marks: null,
            feedback: null,
            evaluatedBy: null,
            evaluatedAt: null,
            submissionAttempt: submission.submissionAttempt + 1,
        };

        if (data.submissionType === 'pdf') {
            if (!file) {
                throw new AppError('File is required', 400);
            }

            const uploaded = await uploadToCloudinary(file.buffer, {
                folder: 'internships/submissions',
            });

            updateData.fileUrl = uploaded.secure_url;
            updateData.fileName = file.originalname;
            updateData.fileSize = file.size;
            updateData.mimeType = file.mimetype;
            updateData.textContent = null;
        } else if (data.submissionType === 'text') {
            if (!data.textContent) {
                throw new AppError('Text content is required', 400);
            }
            updateData.textContent = data.textContent;
            updateData.fileUrl = null;
            updateData.fileName = null;
            updateData.fileSize = null;
        }

        Object.assign(submission, updateData);
        await submission.save();

        return await submission.populate([
            { path: 'assignmentId', select: 'title maxMarks' },
            { path: 'studentId', select: 'name email' },
        ]);
    },

    // ==========================================
    // HELPER METHODS
    // ==========================================

    /**
     * Calculate grade based on marks
     */
    calculateGrade(marks, maxMarks) {
        if (marks === null || !maxMarks) return null;

        const percentage = (marks / maxMarks) * 100;

        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C+';
        if (percentage >= 40) return 'C';
        if (percentage >= 30) return 'D';
        return 'F';
    },
};

module.exports = submissionService;