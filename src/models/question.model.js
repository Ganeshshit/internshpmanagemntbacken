// src/models/question.model.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz',
            required: [true, 'Quiz is required'],
        },

        questionText: {
            type: String,
            required: [true, 'Question text is required'],
            trim: true,
            minlength: 5,
            maxlength: 1000,
        },

        questionType: {
            type: String,
            enum: ['mcq_single', 'mcq_multiple', 'true_false', 'descriptive'],
            default: 'mcq_single',
            required: true,
        },

        options: [{
            optionText: {
                type: String,
                required: true,
                trim: true,
            },
            isCorrect: {
                type: Boolean,
                default: false,
            },
        }],

        correctAnswer: {
            type: mongoose.Schema.Types.Mixed, // Can be string, array, or boolean
            default: null,
        },

        marks: {
            type: Number,
            required: [true, 'Marks is required'],
            min: 1,
            default: 1,
        },

        negativeMarks: {
            type: Number,
            default: 0,
            min: 0,
        },

        explanation: {
            type: String,
            default: null,
            maxlength: 1000,
        },

        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },

        imageUrl: {
            type: String,
            default: null,
        },

        order: {
            type: Number,
            default: 0,
        },

        tags: [{
            type: String,
            trim: true,
        }],

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
questionSchema.index({ quizId: 1, order: 1 });
questionSchema.index({ quizId: 1, isActive: 1 });
questionSchema.index({ questionType: 1 });

// Validation
questionSchema.pre('save', function (next) {
    // Validate options for MCQ questions
    if (this.questionType === 'mcq_single' || this.questionType === 'mcq_multiple') {
        if (!this.options || this.options.length < 2) {
            return next(new Error('MCQ questions must have at least 2 options'));
        }

        const correctOptions = this.options.filter(opt => opt.isCorrect);

        if (this.questionType === 'mcq_single' && correctOptions.length !== 1) {
            return next(new Error('Single choice MCQ must have exactly 1 correct answer'));
        }

        if (this.questionType === 'mcq_multiple' && correctOptions.length < 1) {
            return next(new Error('Multiple choice MCQ must have at least 1 correct answer'));
        }
    }

    // Validate true/false questions
    if (this.questionType === 'true_false') {
        if (typeof this.correctAnswer !== 'boolean') {
            return next(new Error('True/False questions must have a boolean correct answer'));
        }
    }

    next();
});

// Methods
questionSchema.methods.checkAnswer = function (studentAnswer) {
    if (this.questionType === 'descriptive') {
        // Descriptive questions need manual evaluation
        return { isCorrect: null, requiresManualEvaluation: true };
    }

    if (this.questionType === 'true_false') {
        return {
            isCorrect: studentAnswer === this.correctAnswer,
            marksAwarded: studentAnswer === this.correctAnswer ? this.marks : -this.negativeMarks,
        };
    }

    if (this.questionType === 'mcq_single') {
        const correctOption = this.options.find(opt => opt.isCorrect);
        const isCorrect = studentAnswer === correctOption?.optionText;
        return {
            isCorrect,
            marksAwarded: isCorrect ? this.marks : -this.negativeMarks,
        };
    }

    if (this.questionType === 'mcq_multiple') {
        const correctOptions = this.options
            .filter(opt => opt.isCorrect)
            .map(opt => opt.optionText)
            .sort();

        const studentAnswersSorted = Array.isArray(studentAnswer)
            ? studentAnswer.sort()
            : [];

        const isCorrect = JSON.stringify(correctOptions) === JSON.stringify(studentAnswersSorted);
        return {
            isCorrect,
            marksAwarded: isCorrect ? this.marks : -this.negativeMarks,
        };
    }

    return { isCorrect: false, marksAwarded: 0 };
};

questionSchema.methods.getSafeQuestion = function () {
    const question = this.toObject();

    // Remove correct answers for students
    if (question.options) {
        question.options = question.options.map(opt => ({
            optionText: opt.optionText,
            _id: opt._id,
        }));
    }

    delete question.correctAnswer;
    delete question.explanation; // Show after submission

    return question;
};

module.exports = mongoose.model('QuizQuestion', questionSchema);