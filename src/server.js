// src/server.js
// Server bootstrap - Entry point for the application

const app = require('./app');
const config = require('./config');

const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || '/v1';
const Versio = process.env.VERSION || '1.0.0';
// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API: http://localhost:${PORT}/api/${API_VERSION}/`);
  console.log(`Api versio are ${Versio}`)
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = server;