// src/utils/jwt.util.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

class JWTUtil {
  static sign(payload, expiresInMs) {
    return jwt.sign(payload, config.auth.jwt.secret, {
      expiresIn: Math.floor(expiresInMs / 1000), // ✅ convert ms → seconds
      issuer: 'internship-platform',
      audience: 'internship-users',
    });
  }

  static generateAccessToken({ userId, role, sessionId }) {
    return this.sign(
      { sub: userId, role, sid: sessionId, type: 'access' },
      config.auth.jwt.accessTTL
    );
  }

  static generateRefreshToken({ userId, sessionId }) {
    return this.sign(
      { sub: userId, sid: sessionId, type: 'refresh' },
      config.auth.jwt.refreshTTL
    );
  }

  static verifyToken(token) {
    return jwt.verify(token, config.auth.jwt.secret, {
      issuer: 'internship-platform',
      audience: 'internship-users',
    });
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
  }

  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = JWTUtil;
