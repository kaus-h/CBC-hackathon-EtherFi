/**
 * Error Handler Utility
 * Centralized error handling for the application
 */

const logger = require('./logger');

/**
 * Custom error class for application errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle blockchain/ethers errors
 * @param {Error} error Ethers error
 * @returns {AppError} Formatted app error
 */
function handleBlockchainError(error) {
    logger.error('Blockchain error occurred', {
        code: error.code,
        message: error.message,
        reason: error.reason
    });

    // Check for common ethers errors
    if (error.code === 'CALL_EXCEPTION') {
        return new AppError('Smart contract call failed. Contract may not exist or function reverted.', 500);
    }

    if (error.code === 'NETWORK_ERROR') {
        return new AppError('Network connection failed. Please check your RPC endpoint.', 503);
    }

    if (error.code === 'TIMEOUT') {
        return new AppError('Blockchain request timed out. Network may be congested.', 504);
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
        return new AppError('Insufficient funds for transaction.', 400);
    }

    return new AppError(`Blockchain error: ${error.message}`, 500);
}

/**
 * Handle database errors
 * @param {Error} error Database error
 * @returns {AppError} Formatted app error
 */
function handleDatabaseError(error) {
    logger.error('Database error occurred', {
        code: error.code,
        message: error.message,
        detail: error.detail
    });

    // PostgreSQL error codes
    const errorCode = error.code;

    if (errorCode === '23505') {
        // Unique violation
        return new AppError('Duplicate entry found in database.', 409);
    }

    if (errorCode === '23503') {
        // Foreign key violation
        return new AppError('Referenced record does not exist.', 400);
    }

    if (errorCode === '42P01') {
        // Undefined table
        return new AppError('Database table does not exist. Please initialize the schema.', 500);
    }

    if (errorCode === '42703') {
        // Undefined column
        return new AppError('Database column does not exist. Schema may need updating.', 500);
    }

    if (errorCode === '08003' || errorCode === '08006') {
        // Connection error
        return new AppError('Database connection failed. Please check database configuration.', 503);
    }

    return new AppError(`Database error: ${error.message}`, 500);
}

/**
 * Handle API errors (Anthropic, Etherscan, etc.)
 * @param {Error} error API error
 * @param {string} apiName Name of the API
 * @returns {AppError} Formatted app error
 */
function handleAPIError(error, apiName = 'API') {
    logger.error(`${apiName} error occurred`, {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
    });

    const status = error.response?.status;

    if (status === 401) {
        return new AppError(`${apiName} authentication failed. Check API key.`, 401);
    }

    if (status === 403) {
        return new AppError(`${apiName} access forbidden. Check API permissions.`, 403);
    }

    if (status === 429) {
        return new AppError(`${apiName} rate limit exceeded. Please try again later.`, 429);
    }

    if (status >= 500) {
        return new AppError(`${apiName} server error. Service may be down.`, 503);
    }

    return new AppError(`${apiName} error: ${error.message}`, status || 500);
}

/**
 * Handle validation errors
 * @param {object} validationErrors Validation errors object
 * @returns {AppError} Formatted app error
 */
function handleValidationError(validationErrors) {
    const errors = Object.values(validationErrors).join(', ');
    return new AppError(`Validation failed: ${errors}`, 400);
}

/**
 * Express error handler middleware
 * @param {Error} err Error object
 * @param {object} req Express request
 * @param {object} res Express response
 * @param {Function} next Next middleware
 */
function errorMiddleware(err, req, res, next) {
    let error = err;

    // Convert to AppError if not already
    if (!(error instanceof AppError)) {
        // Check error type and convert appropriately
        if (error.name === 'ValidationError') {
            error = handleValidationError(error.errors);
        } else if (error.code && error.code.startsWith('PG')) {
            error = handleDatabaseError(error);
        } else if (error.code && (error.code.startsWith('CALL_') || error.code === 'NETWORK_ERROR')) {
            error = handleBlockchainError(error);
        } else {
            error = new AppError(error.message || 'Internal server error', 500, false);
        }
    }

    // Log error
    if (!error.isOperational) {
        logger.error('Critical error occurred', {
            message: error.message,
            stack: error.stack
        });
    }

    // Send error response
    res.status(error.statusCode).json({
        success: false,
        error: {
            message: error.message,
            statusCode: error.statusCode,
            timestamp: error.timestamp
        },
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack
        })
    });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn Async function
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn Function to retry
 * @param {number} maxRetries Maximum number of retries
 * @param {number} delay Initial delay in milliseconds
 * @returns {Promise<any>} Result of function
 */
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            logger.warn(`Attempt ${attempt} failed, retrying...`, {
                error: error.message,
                nextDelay: delay * attempt
            });

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }

    throw lastError;
}

module.exports = {
    AppError,
    handleBlockchainError,
    handleDatabaseError,
    handleAPIError,
    handleValidationError,
    errorMiddleware,
    asyncHandler,
    retryWithBackoff
};
