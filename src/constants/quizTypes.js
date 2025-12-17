// src/constants/quizTypes.js
// Quiz and question type definitions

const QUIZ_TYPES = {
  MCQ: 'mcq',
  DESCRIPTIVE: 'descriptive',
  MIXED: 'mixed',
};

const QUESTION_TYPES = {
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  DESCRIPTIVE: 'descriptive',
  TRUE_FALSE: 'true_false',
};

const QUIZ_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
};

const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  EVALUATED: 'evaluated',
  EXPIRED: 'expired',
};

const isValidQuizType = (type) => {
  return Object.values(QUIZ_TYPES).includes(type);
};

const isValidQuestionType = (type) => {
  return Object.values(QUESTION_TYPES).includes(type);
};

const isAutoEvaluable = (questionType) => {
  return [
    QUESTION_TYPES.SINGLE_CHOICE,
    QUESTION_TYPES.MULTIPLE_CHOICE,
    QUESTION_TYPES.TRUE_FALSE,
  ].includes(questionType);
};

module.exports = {
  QUIZ_TYPES,
  QUESTION_TYPES,
  QUIZ_STATUS,
  ATTEMPT_STATUS,
  isValidQuizType,
  isValidQuestionType,
  isAutoEvaluable,
};