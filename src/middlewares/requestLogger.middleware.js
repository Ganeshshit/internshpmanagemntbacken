const morgan = require('morgan');
const logger = require('../utils/logger');

morgan.token('body', (req) => JSON.stringify(req.body));

const requestLogger = morgan(
    ':method :url :status :res[content-length] - :response-time ms | IP :remote-addr | UA :user-agent',
    {
        stream: {
            write: (message) => logger.info(message.trim()),
        },
    }
);

module.exports = requestLogger;
