// src/services/auth.service.js
const crypto = require('crypto');
const User = require('../models/user.model');
const Session = require('../models/session.model');
const JWTUtil = require('../utils/jwt.util');
const PasswordUtil = require('../utils/password.util');
const EmailService = require('./email.service');
const config = require('../config');

class AuthService {
  /**
   * Register new user
   */
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

  /**
   * Login user
   */
  static async login({ email, password }, req) {
    const user = await User.findOne({ email }).select('+password');
    if (!user || user.status !== 'active') {
      throw new Error('Invalid credentials');
    }

    const match = await PasswordUtil.comparePassword(password, user.password);
    if (!match) throw new Error('Invalid credentials');

    // Create session
    const session = await Session.create({
      userId: user._id,
      refreshTokenHash: 'TEMP',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + config.auth.session.ttl),
    });

    // Generate tokens
    const refreshToken = JWTUtil.generateRefreshToken({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
    });

    session.refreshTokenHash = JWTUtil.hashToken(refreshToken);
    await session.save();

    const accessToken = JWTUtil.generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
      sessionId: session._id.toString(),
    });

    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
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

  /**
   * Logout user
   */
  static async logout(sessionId) {
    await Session.findByIdAndUpdate(sessionId, { isRevoked: true });
  }

  /**
   * Get user profile
   */
  static async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return user.toSafeObject();
  }

  /**
   * ✅ NEW: Request password reset
   * Generates reset token and sends email
   * ALWAYS returns success (even if email doesn't exist - security best practice)
   */
  static async forgotPassword(email) {
    const user = await User.findOne({ email, status: 'active' });

    // ⚠️ SECURITY: Always return success message (don't reveal if email exists)
    if (!user) {
      // Simulate delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'If that email exists, a reset link has been sent',
      };
    }

    // Generate cryptographically secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing (never store plain tokens)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiry (15 minutes)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Send email with plain token (user needs this to reset)
    try {
      await EmailService.sendPasswordResetEmail(email, resetToken, user.name);
    } catch (error) {
      // Clear token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw new Error('Failed to send reset email. Please try again.');
    }

    return {
      success: true,
      message: 'If that email exists, a reset link has been sent',
    };
  }

  /**
   * ✅ NEW: Reset password with token
   * Validates token and updates password
   */
  static async resetPassword(token, newPassword) {
    // Hash the received token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token that hasn't expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      status: 'active',
    }).select('+password');

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await PasswordUtil.hashPassword(newPassword);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    // Revoke all existing sessions (force re-login)
    await Session.updateMany(
      { userId: user._id },
      { isRevoked: true }
    );

    // Send confirmation email
    try {
      await EmailService.sendPasswordResetConfirmation(user.email, user.name);
    } catch (error) {
      // Don't fail if confirmation email fails
      console.error('Failed to send confirmation email:', error);
    }

    return {
      success: true,
      message: 'Password reset successful. Please login with your new password.',
    };
  }

  /**
   * ✅ NEW: Change password (authenticated user)
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new Error('User not found');

    // Verify current password
    const isMatch = await PasswordUtil.comparePassword(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await PasswordUtil.hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Revoke all other sessions except current
    await Session.updateMany(
      {
        userId: user._id,
        _id: { $ne: user.currentSessionId } // Keep current session
      },
      { isRevoked: true }
    );

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}

module.exports = AuthService;