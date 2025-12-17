// src/models/attempt.model.js
const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz is required'],
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },

    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    answers: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizQuestion',
        required: true,
      },
      answer: {
        type: mongoose.Schema.Types.Mixed, // Can be string, array, or boolean
        required: true,
      },
      isCorrect: {
        type: Boolean,
        default: null,
      },
      marksAwarded: {
        type: Number,
        default: 0,
      },
      timeTaken: {
        type: Number, // in seconds
        default: 0,
      },
    }],

    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },

    incorrectAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },

    unanswered: {
      type: Number,
      default: 0,
      min: 0,
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    timeTaken: {
      type: Number, // in seconds
      default: null,
    },

    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'evaluated', 'expired'],
      default: 'in_progress',
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    isPassed: {
      type: Boolean,
      default: null,
    },

    feedback: {
      type: String,
      default: null,
      maxlength: 1000,
    },

    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    evaluatedAt: {
      type: Date,
      default: null,
    },

    requiresManualEvaluation: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to track attempts per quiz per student
attemptSchema.index({ quizId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });
attemptSchema.index({ studentId: 1, status: 1 });
attemptSchema.index({ quizId: 1, status: 1 });
attemptSchema.index({ submittedAt: -1 });

// Virtuals
attemptSchema.virtual('grade').get(function () {
  if (this.percentage >= 90) return 'A+';
  if (this.percentage >= 80) return 'A';
  if (this.percentage >= 70) return 'B+';
  if (this.percentage >= 60) return 'B';
  if (this.percentage >= 50) return 'C+';
  if (this.percentage >= 40) return 'C';
  if (this.percentage >= 30) return 'D';
  return 'F';
});

attemptSchema.virtual('isCompleted').get(function () {
  return this.status === 'submitted' || this.status === 'evaluated';
});

// Methods
attemptSchema.methods.submit = async function () {
  this.submittedAt = new Date();
  this.timeTaken = Math.floor((this.submittedAt - this.startedAt) / 1000);
  this.status = 'submitted';

  await this.evaluateAttempt();

  return this.save();
};

attemptSchema.methods.evaluateAttempt = async function () {
  const QuizQuestion = mongoose.model('QuizQuestion');
  const Quiz = mongoose.model('Quiz');

  let totalScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let requiresManual = false;

  // Evaluate each answer
  for (let answer of this.answers) {
    const question = await QuizQuestion.findById(answer.questionId);
    if (!question) continue;

    const evaluation = question.checkAnswer(answer.answer);

    if (evaluation.requiresManualEvaluation) {
      requiresManual = true;
      answer.isCorrect = null;
      answer.marksAwarded = 0;
    } else {
      answer.isCorrect = evaluation.isCorrect;
      answer.marksAwarded = evaluation.marksAwarded;
      totalScore += evaluation.marksAwarded;

      if (evaluation.isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }
  }

  this.score = Math.max(0, totalScore); // Prevent negative scores
  this.correctAnswers = correctCount;
  this.incorrectAnswers = incorrectCount;
  this.unanswered = this.totalQuestions - (correctCount + incorrectCount);

  const quiz = await Quiz.findById(this.quizId);
  if (quiz) {
    this.percentage = (this.score / quiz.totalMarks) * 100;
    this.isPassed = this.score >= quiz.passingMarks;
  }

  if (requiresManual) {
    this.requiresManualEvaluation = true;
  } else {
    this.status = 'evaluated';
    this.evaluatedAt = new Date();
  }
};

attemptSchema.methods.manualEvaluate = function (evaluatedById, feedback, additionalMarks = 0) {
  this.score += additionalMarks;
  this.feedback = feedback;
  this.evaluatedBy = evaluatedById;
  this.evaluatedAt = new Date();
  this.status = 'evaluated';
  this.requiresManualEvaluation = false;

  // Recalculate percentage and pass status
  const Quiz = mongoose.model('Quiz');
  return Quiz.findById(this.quizId).then(quiz => {
    if (quiz) {
      this.percentage = (this.score / quiz.totalMarks) * 100;
      this.isPassed = this.score >= quiz.passingMarks;
    }
    return this.save();
  });
};

// Pre-save middleware to calculate attempt number
attemptSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastAttempt = await this.constructor
      .findOne({ quizId: this.quizId, studentId: this.studentId })
      .sort({ attemptNumber: -1 });

    this.attemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('QuizAttempt', attemptSchema);