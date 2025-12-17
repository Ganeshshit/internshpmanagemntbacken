// src/config/auth.config.js
// Authentication configuration

// src/config/auth.config.js
const ms = require('ms');

module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',

    accessTTL: ms(process.env.ACCESS_TOKEN_TTL || '15m'),
    refreshTTL: ms(process.env.REFRESH_TOKEN_TTL || '7d'),
  },


  bcrypt: {
    saltRounds: Number(process.env.SALT_ROUNDS) || 10,
  },

  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  session: {
    maxActiveSessions: 5,
    ttl: ms(process.env.SESSION_TTL || '7d'),
  },
};
