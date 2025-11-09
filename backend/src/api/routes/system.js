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

        // CALCULATE REAL BLOCKCHAIN COLLECTOR SUCCESS RATE
        const blockchainStatsQuery = `
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE collection_status = 'success') as successful
            FROM time_series_data
            WHERE timestamp > NOW() - INTERVAL '24 hours'
                AND data_source = 'blockchain_collector'
        `;
        const blockchainStats = await db.query(blockchainStatsQuery);
        const blockchainTotal = parseInt(blockchainStats.rows[0].total) || 0;
        const blockchainSuccessful = parseInt(blockchainStats.rows[0].successful) || 0;
        const blockchainSuccessRate = blockchainTotal > 0
            ? Math.round((blockchainSuccessful / blockchainTotal) * 100)
            : 0;

        // Check if collectors are running based on recent data
        const now = Date.now();
        const blockchainLastRun = latestData?.timestamp ? new Date(latestData.timestamp) : null;
        const blockchainRunning = blockchainLastRun && (now - blockchainLastRun.getTime()) < 600000; // Last 10 min

        // Calculate anomaly detection success rate
        const totalChecks = (detectionStats?.last24Hours?.anomalousChecks || 0) +
                           (detectionStats?.last24Hours?.normalChecks || 0);
        const anomalySuccessRate = totalChecks > 0 ? 100 : 0;

        // Check if Twitter is actually running (not disabled)
        const twitterEnabled = !!process.env.TWITTER_BEARER_TOKEN;
        const twitterStatsQuery = `
            SELECT COUNT(*) as count
            FROM twitter_sentiment
            WHERE collected_at > NOW() - INTERVAL '24 hours'
        `;
        const twitterStats = await db.query(twitterStatsQuery);
        const twitterCount = parseInt(twitterStats.rows[0].count) || 0;

        // Format collectors as array for frontend
        const collectors = [
            {
                name: 'Blockchain',
                status: blockchainRunning ? 'healthy' : 'warning',
                lastRun: blockchainLastRun?.toISOString(),
                successRate: blockchainSuccessRate,
                uptime: process.uptime(),
                collections24h: blockchainTotal,
                errorMessage: !blockchainRunning ? 'No recent data collection' : null
            },
            {
                name: 'Twitter Sentiment',
                status: twitterEnabled ? (twitterCount > 0 ? 'healthy' : 'warning') : 'disabled',
                lastRun: twitterEnabled ? new Date().toISOString() : null,
                successRate: twitterCount > 0 ? 100 : 0,
                uptime: process.uptime(),
                enabled: twitterEnabled,
                collections24h: twitterCount
            },
            {
                name: 'Anomaly Detector',
                status: totalChecks > 0 ? 'healthy' : 'warning',
                lastRun: detectionStats?.last24Hours?.lastCheck || detectionStats?.last24Hours?.lastClaudeCall,
                successRate: anomalySuccessRate,
                uptime: process.uptime(),
                checks24h: totalChecks,
                claudeCalls24h: detectionStats?.last24Hours?.claudeCalls || 0,
                errorMessage: totalChecks === 0 ? 'No anomaly detection runs yet' : null
            }
        ];

        res.json({
            collectors: collectors,
            lastUpdate: new Date().toISOString(),
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

/**
 * GET /api/system/debug
 * Debug endpoint - check actual database contents and Claude status
 */
router.get('/debug', async (req, res) => {
    try {
        // Count total data points
        const countQuery = 'SELECT COUNT(*) as total FROM time_series_data';
        const countResult = await db.query(countQuery);
        const totalPoints = parseInt(countResult.rows[0].total);

        // Get date range of data
        const rangeQuery = `
            SELECT
                MIN(timestamp) as oldest,
                MAX(timestamp) as newest,
                COUNT(*) as count
            FROM time_series_data
        `;
        const rangeResult = await db.query(rangeQuery);
        const dateRange = rangeResult.rows[0];

        // Get last 10 data points
        const recentQuery = `
            SELECT timestamp, tvl_eth, avg_gas_price_gwei, data_source
            FROM time_series_data
            ORDER BY timestamp DESC
            LIMIT 10
        `;
        const recentResult = await db.query(recentQuery);

        // Check what API would return for 30 days
        const apiTestQuery = `
            SELECT COUNT(*) as api_count
            FROM time_series_data
            WHERE timestamp > NOW() - INTERVAL '720 hours'
        `;
        const apiTestResult = await db.query(apiTestQuery);

        // Check Claude API key
        const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;
        const claudeKeyPrefix = process.env.ANTHROPIC_API_KEY
            ? process.env.ANTHROPIC_API_KEY.substring(0, 20) + '...'
            : 'NOT SET';

        // Get anomaly detection stats
        const detectionStats = await getDetectionStats();

        // Check for anomaly triggers
        const triggersQuery = `
            SELECT COUNT(*) as total,
                   COUNT(*) FILTER (WHERE claude_called = true) as claude_called_count,
                   MAX(timestamp) as last_trigger
            FROM anomaly_triggers
            WHERE timestamp > NOW() - INTERVAL '24 hours'
        `;
        const triggersResult = await db.query(triggersQuery);

        res.json({
            database: {
                total_data_points: totalPoints,
                api_would_return: parseInt(apiTestResult.rows[0].api_count),
                date_range: {
                    oldest: dateRange.oldest,
                    newest: dateRange.newest,
                    span_days: dateRange.count
                },
                recent_points: recentResult.rows.map(r => ({
                    timestamp: r.timestamp,
                    tvl_eth: parseFloat(r.tvl_eth),
                    gas_gwei: parseFloat(r.avg_gas_price_gwei),
                    source: r.data_source
                }))
            },
            claude: {
                api_key_configured: hasClaudeKey,
                api_key_prefix: claudeKeyPrefix,
                model: 'claude-3-5-sonnet-20241022',
                rate_limit_minutes: 5,
                detection_stats: detectionStats,
                triggers_24h: {
                    total: parseInt(triggersResult.rows[0].total),
                    claude_called: parseInt(triggersResult.rows[0].claude_called_count),
                    last_trigger: triggersResult.rows[0].last_trigger
                }
            },
            server: {
                uptime_seconds: Math.round(process.uptime()),
                memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                node_env: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Debug endpoint failed', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Debug failed',
            message: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
