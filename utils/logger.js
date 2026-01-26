const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_TO_CONSOLE = process.env.LOG_CONSOLE === 'true';

const logFormat = format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
});

const transportList = [
    new DailyRotateFile({
        filename: path.join(__dirname, '../logs/app-%DATE%.log'),
        datePattern: 'YYYY-MM',
        maxSize: '50m',
        maxFiles: '12m'
    }),
    new DailyRotateFile({
        filename: path.join(__dirname, '../logs/error-%DATE%.log'),
        datePattern: 'YYYY-MM',
        level: 'error',
        maxSize: '50m',
        maxFiles: '24m'
    })
];

// ⬅️ console ONLY if enabled
if (LOG_TO_CONSOLE) {
    transportList.push(new transports.Console());
}

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        logFormat
    ),
    transports: transportList,
    exitOnError: false
});

module.exports = logger;
