// src/validations/quiz.validation.js
// Quiz validation schemas

const Joi = require('joi');
const { commonSchemas } = require('../middlewares/validate.middleware');
const { QUESTION_TYPES } = require('../constants/quizTypes');

const quizValidation = {
  create: {
    body: Joi.object({
      internshipId: commonSchemas.id.required(),
      title: Joi.string().min(3).max(200).required(),
      description: Joi.string().max(1000),
      totalMarks: Joi.number().integer().min(1).max(1000).default(100),
      duration: Joi.number().integer().min(1).max(300).required(), // minutes
      passingMarks: Joi.number().integer().min(0),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    }),
  },

  update: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    body: Joi.object({
      title: Joi.string().min(3).max(200),
      description: Joi.string().max(1000),
      totalMarks: Joi.number().integer().min(1).max(1000),
      duration: Joi.number().integer().min(1).max(300),
      passingMarks: Joi.number().integer().min(0),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
    }),
  },

  getById: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
  },

  delete: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
  },

  list: {
    query: Joi.object({
      page: commonSchemas.pagination.page,
      limit: commonSchemas.pagination.limit,
      internshipId: commonSchemas.id.optional(),
      status: Joi.string().valid('draft', 'published', 'closed'),
    }),
  },

  addQuestion: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    body: Joi.object({
      questionText: Joi.string().min(5).max(1000).required(),
      type: Joi.string()
        .valid(...Object.values(QUESTION_TYPES))
        .required(),
      options: Joi.array().items(Joi.string()).min(2).when('type', {
        is: Joi.valid('single_choice', 'multiple_choice', 'true_false'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      correctAnswer: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
      ).required(),
      marks: Joi.number().min(1).required(),
      explanation: Joi.string().max(500),
    }),
  },

  updateQuestion: {
    params: Joi.object({
      quizId: commonSchemas.id,
      questionId: commonSchemas.id,
    }),
    body: Joi.object({
      questionText: Joi.string().min(5).max(1000),
      options: Joi.array().items(Joi.string()).min(2),
      correctAnswer: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
      ),
      marks: Joi.number().min(1),
      explanation: Joi.string().max(500),
    }),
  },

  deleteQuestion: {
    params: Joi.object({
      quizId: commonSchemas.id,
      questionId: commonSchemas.id,
    }),
  },

  attemptQuiz: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    body: Joi.object({
      answers: Joi.array().items(
        Joi.object({
          questionId: commonSchemas.id.required(),
          answer: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
          ).required(),
        })
      ).required(),
    }),
  },

  getAttempts: {
    params: Joi.object({
      id: commonSchemas.id,
    }),
    query: Joi.object({
      page: commonSchemas.pagination.page,
      limit: commonSchemas.pagination.limit,
      studentId: commonSchemas.id.optional(),
    }),
  },
};

module.exports = quizValidation;