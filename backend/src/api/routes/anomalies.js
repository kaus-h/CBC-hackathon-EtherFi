/**
 * Anomalies Routes
 */

const express = require('express');
const router = express.Router();
const queries = require('../../database/queries');
const logger = require('../../utils/logger');

/**
 * GET /api/anomalies?limit=10&severity=all
 * Get recent anomalies
 */
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const severity = req.query.severity || 'all';
        const hours = parseInt(req.query.hours) || 168; // Default 7 days

        let anomalies;
        if (severity === 'all') {
            anomalies = await queries.getRecentAnomalies(hours);
        } else {
            anomalies = await queries.getRecentAnomalies(hours, severity.toUpperCase());
        }

        // Apply limit
        anomalies = anomalies.slice(0, limit);

        // Transform response
        const transformed = anomalies.map(a => ({
            id: a.id,
            detected_at: a.detected_at,
            type: a.anomaly_type,
            severity: a.severity,
            confidence: parseFloat(a.confidence),
            title: a.title,
            description: a.description,
            affected_metrics: a.affected_metrics || [],
            recommendation: a.recommendation,
            historical_comparison: a.historical_comparison,
            correlations: a.claude_analysis?.correlations || [],
            timeframe: a.claude_analysis?.timeframe,
            risk_level: a.claude_analysis?.riskLevel,
            status: a.status
        }));

        res.json({
            anomalies: transformed,
            total: transformed.length,
            filter: {
                severity,
                hours,
                limit
            }
        });
    } catch (error) {
        logger.error('Failed to get anomalies', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve anomalies'
        });
    }
});

/**
 * GET /api/anomalies/:id
 * Get specific anomaly details
 */
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid anomaly ID'
            });
        }

        // Get anomaly
        const anomalies = await queries.getRecentAnomalies(720); // 30 days
        const anomaly = anomalies.find(a => a.id === id);

        if (!anomaly) {
            return res.status(404).json({
                error: 'Not Found',
                message: `Anomaly with ID ${id} not found`
            });
        }

        // Get related data points (around detection time)
        const detectionTime = new Date(anomaly.detected_at);
        const startTime = new Date(detectionTime.getTime() - 3600000); // 1 hour before
        const endTime = new Date(detectionTime.getTime() + 3600000); // 1 hour after

        const relatedData = await queries.getTimeSeriesDataRange(startTime, endTime);

        res.json({
            anomaly: {
                id: anomaly.id,
                detected_at: anomaly.detected_at,
                type: anomaly.anomaly_type,
                severity: anomaly.severity,
                confidence: parseFloat(anomaly.confidence),
                title: anomaly.title,
                description: anomaly.description,
                affected_metrics: anomaly.affected_metrics,
                recommendation: anomaly.recommendation,
                historical_comparison: anomaly.historical_comparison,
                claude_analysis: anomaly.claude_analysis,
                raw_data: anomaly.raw_data,
                status: anomaly.status
            },
            related_data: relatedData.map(d => ({
                timestamp: d.timestamp,
                tvl_eth: parseFloat(d.tvl_eth),
                eeth_eth_ratio: parseFloat(d.eeth_eth_ratio),
                avg_gas_price_gwei: parseFloat(d.avg_gas_price_gwei)
            }))
        });
    } catch (error) {
        logger.error('Failed to get anomaly details', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve anomaly details'
        });
    }
});

module.exports = router;
