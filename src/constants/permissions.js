// src/constants/permissions.js
// Permission definitions for RBAC

const { ROLES } = require('./roles');

const PERMISSIONS = {
  // User management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // Internship management
  CREATE_INTERNSHIP: 'create_internship',
  MANAGE_INTERNSHIP: 'manage_internship',
  VIEW_INTERNSHIP: 'view_internship',
  ENROLL_STUDENT: 'enroll_student',
  
  // Attendance
  MARK_ATTENDANCE: 'mark_attendance',
  APPROVE_ATTENDANCE: 'approve_attendance',
  VIEW_ATTENDANCE: 'view_attendance',
  
  // Assignments
  CREATE_ASSIGNMENT: 'create_assignment',
  SUBMIT_ASSIGNMENT: 'submit_assignment',
  EVALUATE_ASSIGNMENT: 'evaluate_assignment',
  VIEW_ASSIGNMENT: 'view_assignment',
  
  // Quizzes
  CREATE_QUIZ: 'create_quiz',
  ATTEMPT_QUIZ: 'attempt_quiz',
  EVALUATE_QUIZ: 'evaluate_quiz',
  VIEW_QUIZ: 'view_quiz',
  
  // Reports
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  
  [ROLES.TRAINER]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_INTERNSHIP,
    PERMISSIONS.MANAGE_INTERNSHIP,
    PERMISSIONS.VIEW_INTERNSHIP,
    PERMISSIONS.ENROLL_STUDENT,
    PERMISSIONS.APPROVE_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.CREATE_ASSIGNMENT,
    PERMISSIONS.EVALUATE_ASSIGNMENT,
    PERMISSIONS.VIEW_ASSIGNMENT,
    PERMISSIONS.CREATE_QUIZ,
    PERMISSIONS.EVALUATE_QUIZ,
    PERMISSIONS.VIEW_QUIZ,
    PERMISSIONS.VIEW_REPORTS,
  ],
  
  [ROLES.STUDENT]: [
    PERMISSIONS.VIEW_INTERNSHIP,
    PERMISSIONS.MARK_ATTENDANCE,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.SUBMIT_ASSIGNMENT,
    PERMISSIONS.VIEW_ASSIGNMENT,
    PERMISSIONS.ATTEMPT_QUIZ,
    PERMISSIONS.VIEW_QUIZ,
  ],
};

const hasPermission = (userRole, permission) => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
};