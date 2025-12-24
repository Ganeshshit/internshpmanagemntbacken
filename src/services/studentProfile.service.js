const User = require('../models/user.model');
const Enrollment = require('../models/enrollment.model');
const Internship = require('../models/internship.model');
const Attendance = require('../models/attendance.model');
const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const mongoose = require('mongoose');

class StudentProfileService {
    static async getFullStudentProfile(studentId) {
        const user = await User.findById(studentId).select('-password');
        if (!user) return null;

        // 1️⃣ Enrollments
        const enrollments = await Enrollment.find({
            studentId,
            status: { $in: ['active', 'completed'] },
        }).populate('internshipId');

        let overallAttendancePresent = 0;
        let overallAttendanceTotal = 0;
        let totalAssignmentMarks = 0;
        let evaluatedAssignments = 0;

        const internshipDetails = [];

        for (const enrollment of enrollments) {
            const internship = enrollment.internshipId;

            // 2️⃣ Attendance Stats
            const attendanceAgg = await Attendance.aggregate([
                {
                    $match: {
                        internshipId: internship._id,
                        studentId: new mongoose.Types.ObjectId(studentId),
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        present: {
                            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
                        },
                    },
                },
            ]);

            const attendance = attendanceAgg[0] || { total: 0, present: 0 };
            const attendancePercentage =
                attendance.total === 0
                    ? 0
                    : +(attendance.present / attendance.total * 100).toFixed(2);

            overallAttendanceTotal += attendance.total;
            overallAttendancePresent += attendance.present;

            // 3️⃣ Assignments
            const assignments = await Assignment.find({
                internshipId: internship._id,
                status: 'published',
            });

            const assignmentIds = assignments.map(a => a._id);

            const submissions = await Submission.find({
                assignmentId: { $in: assignmentIds },
                studentId,
            });

            const evaluated = submissions.filter(s => s.marks !== null);
            const avgMarks =
                evaluated.length === 0
                    ? 0
                    : Math.round(
                        evaluated.reduce((a, b) => a + b.marks, 0) / evaluated.length
                    );

            totalAssignmentMarks += evaluated.reduce((a, b) => a + b.marks, 0);
            evaluatedAssignments += evaluated.length;

            internshipDetails.push({
                internship,
                enrollment,
                attendance: {
                    total: attendance.total,
                    present: attendance.present,
                    percentage: attendancePercentage,
                },
                assignments: {
                    total: assignments.length,
                    submitted: submissions.length,
                    evaluated: evaluated.length,
                    averageMarks: avgMarks,
                },
            });
        }

        // 4️⃣ Overall Performance
        const overallAttendancePercentage =
            overallAttendanceTotal === 0
                ? 0
                : +(overallAttendancePresent / overallAttendanceTotal * 100).toFixed(2);

        const overallAverageAssignmentScore =
            evaluatedAssignments === 0
                ? 0
                : +(totalAssignmentMarks / evaluatedAssignments).toFixed(2);

        return {
            user,
            internships: internshipDetails,
            overallPerformance: {
                attendancePercentage: overallAttendancePercentage,
                averageAssignmentScore: overallAverageAssignmentScore,
            },
        };
    }
}

module.exports = StudentProfileService;
