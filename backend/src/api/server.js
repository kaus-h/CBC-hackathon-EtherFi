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
server.listen(PORT, async () => {
    logger.info('========================================');
    logger.info('EtherFi Anomaly Detection API Server');
    logger.info('========================================');
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`API Base URL: http://localhost:${PORT}/api`);
    logger.info('========================================');

    // Check if historical baseline data needs to be loaded
    if (process.env.NODE_ENV === 'production') {
        try {
            const dataCheck = await db.query('SELECT COUNT(*) FROM time_series_data');
            const recordCount = parseInt(dataCheck.rows[0].count);

            if (recordCount < 10) {
                logger.info('========================================');
                logger.info('Historical Baseline Data Needed');
                logger.info('========================================');
                logger.warn(`Only ${recordCount} data points found`);
                logger.info('Loading 7 days of historical baseline data...');
                logger.info('This will run in the background (~5-10 minutes)');
                logger.info('Note: Uses Etherscan & Alchemy APIs');
                logger.info('========================================');

                // Load historical data in background (non-blocking)
                const { loadHistoricalData } = require('../collectors/historical-loader');
                loadHistoricalData(7).then(() => {
                    logger.success('🎉 Historical baseline data loaded successfully!');
                    logger.info('Dashboard will now show 7 days of historical charts');
                }).catch(err => {
                    logger.error('Failed to load historical data', {
                        error: err.message,
                        stack: err.stack
                    });
                    logger.warn('Continuing with real-time collection only');
                });
            } else {
                logger.info(`✅ Database has ${recordCount} data points - baseline established`);
            }
        } catch (error) {
            logger.warn('Could not check historical data', { error: error.message });
        }
    }

    // Start data collectors in production
    if (process.env.NODE_ENV === 'production') {
        logger.info('========================================');
        logger.info('Starting Data Collectors (Production)');
        logger.info('========================================');

        try {
            const { startContinuousCollection: startBlockchainCollector } = require('../collectors/blockchain-collector');
            const { startContinuousCollection: startTwitterCollector } = require('../collectors/twitter-collector');

            // Start blockchain collector (runs every 5 minutes)
            logger.info('Starting blockchain data collector...');
            logger.info('Collector will use: Alchemy, Etherscan, Chainlink oracles');
            startBlockchainCollector().catch(err => {
                logger.error('Blockchain collector failed to start', {
                    error: err.message,
                    stack: err.stack
                });
            });

            // Start Twitter collector (runs every 5 minutes)
            logger.info('Starting Twitter sentiment collector...');
            startTwitterCollector().catch(err => {
                logger.error('Twitter collector failed to start', {
                    error: err.message,
                    stack: err.stack
                });
            });

            logger.info('Data collectors started successfully');
            logger.info('========================================');
        } catch (error) {
            logger.error('Failed to start data collectors', {
                error: error.message,
                stack: error.stack
            });
            logger.warn('API server will continue without data collection');
        }
    } else {
        logger.info('Development mode: Data collectors not auto-started');
        logger.info('Run collectors manually if needed');
    }
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
