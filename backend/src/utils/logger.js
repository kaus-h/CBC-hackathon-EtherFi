/**
 * Logger Utility
 * Provides structured logging throughout the application
 */

const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

// Current log level from environment
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// Log file path
const logDir = path.join(__dirname, '../../logs');
const logFile = path.join(logDir, process.env.LOG_FILE || 'app.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Format log message
 * @param {string} level Log level
 * @param {string} message Log message
 * @param {object} meta Additional metadata
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

/**
 * Write log to file
 * @param {string} message Formatted log message
 */
function writeToFile(message) {
    try {
        fs.appendFileSync(logFile, message + '\n', 'utf8');
    } catch (error) {
        console.error('Failed to write to log file:', error.message);
    }
}

/**
 * Log error message
 * @param {string} message Error message
 * @param {object} meta Additional metadata
 */
function error(message, meta = {}) {
    const formattedMessage = formatLogMessage('ERROR', message, meta);
    console.error('\x1b[31m%s\x1b[0m', formattedMessage); // Red color
    writeToFile(formattedMessage);
}

/**
 * Log warning message
 * @param {string} message Warning message
 * @param {object} meta Additional metadata
 */
function warn(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
        const formattedMessage = formatLogMessage('WARN', message, meta);
        console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // Yellow color
        writeToFile(formattedMessage);
    }
}

/**
 * Log info message
 * @param {string} message Info message
 * @param {object} meta Additional metadata
 */
function info(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
        const formattedMessage = formatLogMessage('INFO', message, meta);
        console.log('\x1b[36m%s\x1b[0m', formattedMessage); // Cyan color
        writeToFile(formattedMessage);
    }
}

/**
 * Log debug message
 * @param {string} message Debug message
 * @param {object} meta Additional metadata
 */
function debug(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        const formattedMessage = formatLogMessage('DEBUG', message, meta);
        console.log('\x1b[90m%s\x1b[0m', formattedMessage); // Gray color
        writeToFile(formattedMessage);
    }
}

/**
 * Log success message
 * @param {string} message Success message
 * @param {object} meta Additional metadata
 */
function success(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
        const formattedMessage = formatLogMessage('SUCCESS', message, meta);
        console.log('\x1b[32m%s\x1b[0m', formattedMessage); // Green color
        writeToFile(formattedMessage);
    }
}

module.exports = {
    error,
    warn,
    info,
    debug,
    success
};
