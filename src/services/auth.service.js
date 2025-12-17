// src/services/auth.service.js

const crypto = require('crypto');
const User = require('../models/user.model');
const Session = require('../models/session.model');
const JWTUtil = require('../utils/jwt.util');
const PasswordUtil = require('../utils/password.util');
const config = require('../config');

class AuthService {
  static async register({ name, email, password, role }) {
    const exists = await User.findOne({ email });
    if (exists) throw new Error('Email already registered');

    const hashed = await PasswordUtil.hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
    });

    return user.toSafeObject();
  }

  static async login({ email, password }, req) {
    const user = await User.findOne({ email }).select('+password');
    if (!user || user.status !== 'active') {
      throw new Error('Invalid credentials');
    }

    const match = await PasswordUtil.comparePassword(password, user.password);
    if (!match) throw new Error('Invalid credentials');

    // 1️⃣ Create session FIRST (no refresh token yet)
    const session = await Session.create({
      userId: user._id,
      refreshTokenHash: 'TEMP', // placeholder
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + config.auth.session.ttl),
    });

    // 2️⃣ Generate refresh token USING session ID
    const refreshToken = JWTUtil.generateRefreshToken({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
    });

    // 3️⃣ Update session with hashed refresh token
    session.refreshTokenHash = JWTUtil.hashToken(refreshToken);
    await session.save();

    // 4️⃣ Generate access token
    const accessToken = JWTUtil.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
      sessionId: session._id.toString(),
    });

    // 5️⃣ Update user last login
    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    };
  }


  static async refreshToken(oldToken) {
    const decoded = JWTUtil.verifyToken(oldToken);
    if (decoded.type !== 'refresh') throw new Error('Invalid refresh token');

    const session = await Session.findById(decoded.sid);
    if (!session || session.isRevoked) {
      throw new Error('Session expired');
    }

    if (session.refreshTokenHash !== JWTUtil.hashToken(oldToken)) {
      session.isRevoked = true;
      await session.save();
      throw new Error('Token reuse detected');
    }

    const newRefreshToken = JWTUtil.generateRefreshToken({
      userId: decoded.sub,
      sessionId: session._id,
    });

    session.refreshTokenHash = JWTUtil.hashToken(newRefreshToken);
    await session.save();

    const user = await User.findById(decoded.sub);

    const newAccessToken = JWTUtil.generateAccessToken({
      userId: user._id,
      role: user.role,
      sessionId: session._id,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(sessionId) {
    await Session.findByIdAndUpdate(sessionId, { isRevoked: true });
  }

  static async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return user.toSafeObject();
  }
}

module.exports = AuthService;
