// src/controllers/auth.controller.js

const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/response.util');

class AuthController {
  static async register(req, res) {
    const user = await AuthService.register(req.body);
    return ApiResponse.created(res, user, 'User registered');
  }

  static async login(req, res) {
    const { user, accessToken, refreshToken } =
      await AuthService.login(req.body, req);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, { user }, 'Login successful');
  }


  static async refreshToken(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new Error('Refresh token missing');

    const { accessToken, refreshToken: newRefresh } =
      await AuthService.refreshToken(refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, null, 'Token refreshed');
  }


  static async getProfile(req, res) {
    const user = await AuthService.getProfile(req.user.userId);
    return ApiResponse.success(res, user);
  }

  static async logout(req, res) {
    await AuthService.logout(req.user.sessionId);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return ApiResponse.success(res, null, 'Logged out');
  }

}

module.exports = AuthController;
