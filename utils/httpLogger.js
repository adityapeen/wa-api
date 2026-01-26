const morgan = require('morgan');
const logger = require('./logger');

const MODE = process.env.HTTP_LOGGER || 'console';

/**
 * Available modes:
 * - console : log to console + file
 * - file    : log to file only
 * - off     : disable http logger
 */

if (MODE === 'off') {
    module.exports = (req, res, next) => next();
    return;
}

morgan.token('body', req => {
    try {
        return JSON.stringify(req.body);
    } catch (e) {
        return '[unserializable-body]';
    }
});

const format = ':method :url :status :response-time ms';

const stream = {
    write: (message) => {
        const log = message.trim();

        // Always log to file
        logger.info(log);

        // Optional console output
        if (MODE === 'console') {
            process.stdout.write(log + '\n');
        }
    }
};

module.exports = morgan(format, { stream });
