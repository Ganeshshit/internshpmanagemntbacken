// src/constants/assignmentTypes.js
// Assignment type definitions

const ASSIGNMENT_TYPES = {
  PDF: 'pdf',
  TEXT: 'text',
  QUIZ: 'quiz',
};

const SUBMISSION_TYPES = {
  FILE: 'file',
  TEXT: 'text',
};

const ASSIGNMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
};

const SUBMISSION_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  EVALUATED: 'evaluated',
  LATE: 'late',
};

const isValidAssignmentType = (type) => {
  return Object.values(ASSIGNMENT_TYPES).includes(type);
};

const isValidSubmissionType = (type) => {
  return Object.values(SUBMISSION_TYPES).includes(type);
};

module.exports = {
  ASSIGNMENT_TYPES,
  SUBMISSION_TYPES,
  ASSIGNMENT_STATUS,
  SUBMISSION_STATUS,
  isValidAssignmentType,
  isValidSubmissionType,
};