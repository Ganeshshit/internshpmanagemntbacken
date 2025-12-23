// src/controllers/auth.controller.js
const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/response.util');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');

class AuthController {
  /**
   * Register new user
   */
  static register = asyncHandler(async (req, res) => {
    const user = await AuthService.register(req.body);
    return ApiResponse.created(res, user, 'User registered successfully');
  });

  /**
   * Login user and issue tokens
   */
  static login = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } =
      await AuthService.login(req.body, req);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.success(res, { user }, 'Login successful');
  });

  /**
   * Refresh access token using refresh token (cookie-based)
   */
  static refreshToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new AppError('Refresh token missing', 401);
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await AuthService.refreshToken(refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, null, 'Token refreshed successfully');
  });

  /**
   * Get logged-in user profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const user = await AuthService.getProfile(req.user.userId);
    return ApiResponse.success(res, user);
  });

  /**
   * Logout user and revoke session
   */
  static logout = asyncHandler(async (req, res) => {
    await AuthService.logout(req.user.sessionId);

    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return ApiResponse.success(res, null, 'Logged out successfully');
  });

  /**
   * ✅ NEW: Request password reset
   * POST /api/auth/forgot-password
   * Body: { email }
   */
  static forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);

    return ApiResponse.success(
      res,
      null,
      'If that email exists, a password reset link has been sent'
    );
  });

  /**
   * ✅ NEW: Reset password with token
   * POST /api/auth/reset-password
   * Body: { token, newPassword }
   */
  static resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const result = await AuthService.resetPassword(token, newPassword);

    return ApiResponse.success(
      res,
      null,
      'Password reset successful. Please login with your new password.'
    );
  });

  /**
   * ✅ NEW: Change password (authenticated)
   * PUT /api/auth/change-password
   * Body: { currentPassword, newPassword }
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await AuthService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    return ApiResponse.success(res, null, 'Password changed successfully');
  });
}

module.exports = AuthController;