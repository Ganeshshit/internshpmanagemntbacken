// src/services/submission.service.js
const Submission = require('../models/submission.model');
const Assignment = require('../models/assignment.model');
const InternshipEnrollment = require('../models/enrollment.model');
const { AppError } = require('../middlewares/error.middleware');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary.util');
const DateUtil = require('../utils/date.util');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');

const submissionService = {
    // ==========================================
    // TRAINER SERVICES
    // ==========================================

    /**
     * Get submission for evaluation with full details
     */
    async getSubmissionForEvaluation(submissionId, trainerId) {
        const submission = await Submission.findById(submissionId)
            .populate('assignmentId', 'title type maxMarks passingMarks gradingCriteria createdBy')
            .populate('studentId', 'name email')
            .populate('evaluatedBy', 'name');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Verify trainer owns the assignment
        const assignment = submission.assignmentId;
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        // Add enriched data
        return {
            ...submission.toObject(),
            assignment: {
                title: assignment.title,
                type: assignment.type,
                maxMarks: assignment.maxMarks,
                passingMarks: assignment.passingMarks,
                gradingCriteria: assignment.gradingCriteria,
            },
            student: {
                name: submission.studentId.name,
                email: submission.studentId.email,
            },
            canEvaluate: submission.status !== 'resubmit_required',
        };
    },

    /**
     * Evaluate submission with marks and feedback
     */
    async evaluateSubmission(submissionId, trainerId, evaluationData) {
        const { marks, feedback, grade } = evaluationData;

        const submission = await Submission.findById(submissionId)
            .populate('assignmentId');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        const assignment = submission.assignmentId;

        // Verify trainer ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        // Validate marks
        if (marks < 0 || marks > assignment.maxMarks) {
            throw new AppError(`Marks must be between 0 and ${assignment.maxMarks}`, 400);
        }

        // Check if already evaluated
        if (submission.status === 'evaluated' && submission.marks !== null) {
            throw new AppError('This submission has already been evaluated. Use update evaluation endpoint to modify.', 400);
        }

        // Calculate grade if not provided
        let finalGrade = grade;
        if (!finalGrade) {
            const percentage = (marks / assignment.maxMarks) * 100;
            finalGrade = this._calculateGrade(percentage);
        }

        // Update submission
        submission.marks = marks;
        submission.feedback = feedback;
        submission.evaluatedBy = trainerId;
        submission.evaluatedAt = new Date();
        submission.status = 'evaluated';

        await submission.save();

        // Update student progress in enrollment
        await this._updateStudentProgress(submission.studentId, assignment.internshipId);

        // Populate for response
        await submission.populate([
            { path: 'studentId', select: 'name email' },
            { path: 'evaluatedBy', select: 'name' },
            { path: 'assignmentId', select: 'title maxMarks' }
        ]);

        return submission;
    },

    /**
     * Request resubmission from student
     */
    async requestResubmission(submissionId, trainerId, feedback) {
        const submission = await Submission.findById(submissionId)
            .populate('assignmentId');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        const assignment = submission.assignmentId;

        // Verify trainer ownership
        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        // Check resubmission limit
        if (submission.submissionAttempt >= assignment.maxResubmissions) {
            throw new AppError('Maximum resubmission attempts reached', 400);
        }

        // Update submission
        submission.status = 'resubmit_required';
        submission.feedback = feedback;
        submission.evaluatedBy = trainerId;
        submission.evaluatedAt = new Date();
        submission.marks = null; // Clear previous marks

        await submission.save();

        return submission;
    },

    /**
     * Bulk evaluate multiple submissions
     */
    async bulkEvaluateSubmissions(trainerId, submissions) {
        const results = {
            successCount: 0,
            failedCount: 0,
            errors: [],
        };

        for (const item of submissions) {
            try {
                await this.evaluateSubmission(
                    item.submissionId,
                    trainerId,
                    {
                        marks: item.marks,
                        feedback: item.feedback,
                    }
                );
                results.successCount++;
            } catch (error) {
                results.failedCount++;
                results.errors.push({
                    submissionId: item.submissionId,
                    error: error.message,
                });
            }
        }

        return results;
    },

    /**
     * Export submissions as CSV or Excel
     */
    async exportSubmissions(assignmentId, trainerId, format) {
        const assignment = await Assignment.findById(assignmentId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        if (assignment.createdBy.toString() !== trainerId.toString()) {
            throw new AppError('Access denied', 403);
        }

        const submissions = await Submission.find({ assignmentId })
            .populate('studentId', 'name email')
            .sort({ submittedAt: -1 })
            .lean();

        const data = submissions.map((s) => ({
            'Student Name': s.studentId?.name || 'N/A',
            'Student Email': s.studentId?.email || 'N/A',
            'Submitted At': new Date(s.submittedAt).toLocaleString(),
            'Submission Type': s.submissionType,
            'Status': s.status,
            'Marks': s.marks !== null ? s.marks : 'Not Evaluated',
            'Grade': s.grade || 'N/A',
            'Is Late': s.isLate ? 'Yes' : 'No',
            'Attempt': s.submissionAttempt,
            'Feedback': s.feedback || 'No feedback',
        }));

        if (format === 'csv') {
            const parser = new Parser();
            return Buffer.from(parser.parse(data));
        }

        // Excel format
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Submissions');

        worksheet.columns = [
            { header: 'Student Name', key: 'Student Name', width: 20 },
            { header: 'Student Email', key: 'Student Email', width: 30 },
            { header: 'Submitted At', key: 'Submitted At', width: 20 },
            { header: 'Submission Type', key: 'Submission Type', width: 15 },
            { header: 'Status', key: 'Status', width: 15 },
            { header: 'Marks', key: 'Marks', width: 10 },
            { header: 'Grade', key: 'Grade', width: 10 },
            { header: 'Is Late', key: 'Is Late', width: 10 },
            { header: 'Attempt', key: 'Attempt', width: 10 },
            { header: 'Feedback', key: 'Feedback', width: 50 },
        ];

        worksheet.addRows(data);

        // Style header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
        };

        return await workbook.xlsx.writeBuffer();
    },

    // ==========================================
    // STUDENT SERVICES
    // ==========================================

    /**
     * Get all submissions for a student
     */
    async getStudentSubmissions(studentId, filters = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            internshipId,
        } = filters;

        const query = { studentId };

        if (status) query.status = status;
        if (internshipId) {
            const assignments = await Assignment.find({ internshipId }).select('_id');
            query.assignmentId = { $in: assignments.map(a => a._id) };
        }

        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            Submission.find(query)
                .populate('assignmentId', 'title type maxMarks dueDate')
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

    /**
     * Resubmit assignment (if allowed)
     */
    async resubmitAssignment(submissionId, studentId, data, file) {
        const submission = await Submission.findById(submissionId)
            .populate('assignmentId');

        if (!submission) {
            throw new AppError('Submission not found', 404);
        }

        // Verify ownership
        if (submission.studentId.toString() !== studentId.toString()) {
            throw new AppError('Access denied', 403);
        }

        // Check if resubmission is allowed
        if (submission.status !== 'resubmit_required') {
            throw new AppError('Resubmission not allowed for this submission', 400);
        }

        const assignment = submission.assignmentId;

        // Check resubmission limit
        if (submission.submissionAttempt >= assignment.maxResubmissions) {
            throw new AppError('Maximum resubmission attempts reached', 400);
        }

        // Delete old file if exists
        if (submission.fileUrl) {
            await deleteFromCloudinary(submission.fileUrl);
        }

        // Upload new file if provided
        if (file) {
            const uploaded = await uploadToCloudinary(file.buffer, {
                folder: 'internships/submissions',
            });

            submission.fileUrl = uploaded.secure_url;
            submission.fileName = file.originalname;
            submission.fileSize = file.size;
            submission.mimeType = file.mimetype;
        }

        // Update text content if provided
        if (data.textContent) {
            submission.textContent = data.textContent;
        }

        // Update submission details
        submission.status = 'submitted';
        submission.submissionAttempt += 1;
        submission.submittedAt = new Date();
        submission.marks = null;
        submission.feedback = null;
        submission.evaluatedBy = null;
        submission.evaluatedAt = null;

        await submission.save();

        return submission.populate('assignmentId', 'title type maxMarks');
    },

    // ==========================================
    // HELPER METHODS
    // ==========================================

    /**
     * Calculate grade based on percentage
     */
    _calculateGrade(percentage) {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C+';
        if (percentage >= 40) return 'C';
        if (percentage >= 30) return 'D';
        return 'F';
    },

    /**
     * Update student progress in enrollment
     */
    async _updateStudentProgress(studentId, internshipId) {
        const enrollment = await InternshipEnrollment.findOne({
            studentId,
            internshipId,
        });

        if (enrollment) {
            await enrollment.updateProgress();
        }
    },
};

module.exports = submissionService;