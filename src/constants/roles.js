// src/constants/roles.js
// User role definitions

const ROLES = {
  ADMIN: 'admin',
  TRAINER: 'trainer',
  STUDENT: 'student',
};

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.TRAINER]: 2,
  [ROLES.STUDENT]: 1,
};

const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

const hasHigherRole = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  isValidRole,
  hasHigherRole,
};