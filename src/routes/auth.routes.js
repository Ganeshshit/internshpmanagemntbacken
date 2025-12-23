// const express = require('express');
// const AuthController = require('../controllers/auth.controller');
// const authMiddleware = require('../middlewares/auth.middleware');
// const { validate } = require('../middlewares/validate.middleware'); // ✅ FIX
// const authValidation = require('../validations/auth.validation');

// const router = express.Router();
// router.post('/register', validate(authValidation.register), AuthController.register);

// router.post('/login', validate(authValidation.login), AuthController.login);
// router.post('/refresh-token', validate(authValidation.refreshToken), AuthController.refreshToken);

// router.get('/me', authMiddleware, AuthController.getProfile);
// router.post('/logout', authMiddleware, AuthController.logout);

// module.exports = router;
// src/routes/auth.routes.js
const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const authValidation = require('../validations/auth.validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ✅ Rate limiting for sensitive endpoints
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 requests per 15 minutes
    message: 'Too many password reset requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many password reset attempts. Please try again later.',
});

// Public routes
router.post('/register', validate(authValidation.register), AuthController.register);
router.post('/login', validate(authValidation.login), AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// ✅ NEW: Password reset routes
router.post(
    '/forgot-password',
    forgotPasswordLimiter,
    validate(authValidation.forgotPassword),
    AuthController.forgotPassword
);

router.post(
    '/reset-password',
    resetPasswordLimiter,
    validate(authValidation.resetPassword),
    AuthController.resetPassword
);

// Protected routes (require authentication)
router.get('/me', authMiddleware, AuthController.getProfile);
router.post('/logout', authMiddleware, AuthController.logout);
router.put(
    '/change-password',
    authMiddleware,
    validate(authValidation.changePassword),
    AuthController.changePassword
);

module.exports = router;