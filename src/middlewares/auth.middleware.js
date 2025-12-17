// src/middlewares/auth.middleware.js

const JWTUtil = require('../utils/jwt.util');
const Session = require('../models/session.model');
const User = require('../models/user.model');
const { AppError, asyncHandler } = require('./error.middleware');

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) throw new AppError('Access token required', 401);


  const decoded = JWTUtil.verifyToken(token);

  if (decoded.type !== 'access') {
    throw new AppError('Invalid access token', 401);
  }

  const session = await Session.findById(decoded.sid);
  if (!session || session.isRevoked) {
    throw new AppError('Session expired', 401);
  }

  const user = await User.findById(decoded.sub).select('-password');
  if (!user || user.status !== 'active') {
    throw new AppError('User not authorized', 403);
  }

  req.user = {
    userId: user._id,
    role: user.role,
    sessionId: session._id,
  };

  next();
});

module.exports = authMiddleware;
