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

const express = require('express');
const AuthController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const authValidation = require('../validations/auth.validation');

const router = express.Router();

router.post('/register', validate(authValidation.register), AuthController.register);
router.post('/login', validate(authValidation.login), AuthController.login);

// ✅ NO validation here (cookie-based refresh)
router.post('/refresh-token', AuthController.refreshToken);

router.get('/me', authMiddleware, AuthController.getProfile);
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
