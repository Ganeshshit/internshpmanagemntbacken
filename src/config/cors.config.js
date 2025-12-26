// src/config/cors.config.js

const normalize = (url) => url?.replace(/\/$/, '');

const allowedOrigins = [
  normalize(process.env.FRONTEND_URL),
  'https://internshipmanagement.vercel.app',
  'https://localhost:5173', // local HTTPS
  'http://localhost:5173',  // local HTTP (optional)
].filter(Boolean);

module.exports = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],

  exposedHeaders: ['Content-Range', 'X-Content-Range'],

  maxAge: 600,
};
