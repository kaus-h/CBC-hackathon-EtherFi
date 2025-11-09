/**
 * Health Check Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../../database/db-connection');

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
    try {
        // Check database connection
        const dbResult = await db.query('SELECT NOW()');
        const dbConnected = dbResult && dbResult.rows.length > 0;

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                connected: dbConnected,
                timestamp: dbResult.rows[0].now
            },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            message: 'Service unavailable',
            error: error.message
        });
    }
});

module.exports = router;
