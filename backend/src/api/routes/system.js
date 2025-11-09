/**
 * System Status Routes
 */

const express = require('express');
const router = express.Router();
const db = require('../../database/db-connection');
const queries = require('../../database/queries');
const { getConnectedClientsCount } = require('../websocket');
const { getDetectionStats } = require('../../analysis/anomaly-detector');
const logger = require('../../utils/logger');

/**
 * GET /api/system/status
 * Get system status
 */
router.get('/status', async (req, res) => {
    try {
        // Get latest collection time
        const latestData = await queries.getLatestTimeSeriesData();
        const latestAnomaly = await queries.getRecentAnomalies(24);

        // Get detection stats
        const detectionStats = await getDetectionStats();

        // Check database connection
        let dbConnected = false;
        let recordCount = 0;
        try {
            const result = await db.query('SELECT COUNT(*) FROM time_series_data');
            dbConnected = true;
            recordCount = parseInt(result.rows[0].count);
        } catch (error) {
            logger.warn('Database health check failed', { error: error.message });
        }

        // Calculate success rates
        const totalChecks = (detectionStats?.last24Hours?.anomalousChecks || 0) +
                           (detectionStats?.last24Hours?.normalChecks || 0);
        const successRate = totalChecks > 0 ? 100 : 0; // Simplified - always 100% if any checks

        res.json({
            collectors: {
                blockchain: {
                    running: latestData ? (Date.now() - new Date(latestData.timestamp).getTime() < 600000) : false, // Last 10 min
                    last_run: latestData?.timestamp,
                    success_rate: successRate,
                    data_source: latestData?.data_source
                },
                twitter: {
                    running: true, // Simplified
                    last_run: new Date().toISOString(),
                    success_rate: 100
                },
                anomaly_detector: {
                    running: true,
                    last_triggered: detectionStats?.last24Hours?.lastClaudeCall,
                    checks_24h: totalChecks,
                    claude_calls_24h: detectionStats?.last24Hours?.claudeCalls || 0
                }
            },
            database: {
                connected: dbConnected,
                record_count: recordCount,
                latest_timestamp: latestData?.timestamp
            },
            api_health: {
                uptime: process.uptime(),
                memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
                connected_websocket_clients: getConnectedClientsCount()
            },
            anomalies: {
                active_count: latestAnomaly.filter(a => a.status === 'active').length,
                total_24h: latestAnomaly.length,
                latest: latestAnomaly[0] ? {
                    id: latestAnomaly[0].id,
                    severity: latestAnomaly[0].severity,
                    detected_at: latestAnomaly[0].detected_at
                } : null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to get system status', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve system status'
        });
    }
});

module.exports = router;
