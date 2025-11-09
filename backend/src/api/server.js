/**
 * Express API Server with WebSocket Support
 * Phases 6 & 7: REST API + Real-time WebSocket updates
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const logger = require('../utils/logger');
const db = require('../database/db-connection');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const { initializeWebSocket } = require('./websocket');
const io = initializeWebSocket(server);

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://etherfi-anomanly.up.railway.app']
        : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug('API Request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });
    next();
});

// ==================== API ROUTES ====================

// Import route modules
const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');
const anomaliesRoutes = require('./routes/anomalies');
const baselineRoutes = require('./routes/baseline');
const sentimentRoutes = require('./routes/sentiment');
const systemRoutes = require('./routes/system');

// Mount routes
app.use('/api/health', healthRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/anomalies', anomaliesRoutes);
app.use('/api/baseline', baselineRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/system', systemRoutes);

// Root endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'EtherFi Anomaly Detection API',
        version: '1.0.0',
        status: 'operational',
        endpoints: [
            '/api/health',
            '/api/metrics/current',
            '/api/metrics/historical',
            '/api/anomalies',
            '/api/baseline',
            '/api/sentiment',
            '/api/system/status'
        ]
    });
});

// ==================== STATIC FILES (Production) ====================

if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../../../frontend/dist');
    app.use(express.static(frontendPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        availableRoutes: '/api'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('API Error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 3001;

// Initialize database connection
db.initializePool();

// Start server
server.listen(PORT, () => {
    logger.info('========================================');
    logger.info('EtherFi Anomaly Detection API Server');
    logger.info('========================================');
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`API Base URL: http://localhost:${PORT}/api`);
    logger.info('========================================');
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGINT', async () => {
    logger.info('\nReceived SIGINT, shutting down gracefully...');

    server.close(() => {
        logger.info('HTTP server closed');
    });

    await db.closePool();
    logger.info('Database connections closed');

    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('\nReceived SIGTERM, shutting down gracefully...');

    server.close(() => {
        logger.info('HTTP server closed');
    });

    await db.closePool();
    logger.info('Database connections closed');

    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
        error: err.message,
        stack: err.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
        reason,
        promise
    });
});

module.exports = { app, server };
