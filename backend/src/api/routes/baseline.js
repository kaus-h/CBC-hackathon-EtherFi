/**
 * Baseline Statistics Routes
 */

const express = require('express');
const router = express.Router();
const { getBaselineStatistics } = require('../../analysis/baseline-calculator');
const logger = require('../../utils/logger');

/**
 * GET /api/baseline?days=30
 * Get baseline statistics
 */
router.get('/', async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);

        const baseline = await getBaselineStatistics(days);

        res.json({
            tvl_avg: baseline.tvl_avg,
            tvl_stddev: baseline.tvl_stddev,
            tvl_min: baseline.tvl_min,
            tvl_max: baseline.tvl_max,
            peg_avg: baseline.peg_avg,
            peg_stddev: baseline.peg_stddev,
            peg_min: baseline.peg_min,
            peg_max: baseline.peg_max,
            gas_avg: baseline.gas_avg,
            gas_stddev: baseline.gas_stddev,
            sentiment_avg: baseline.sentiment_avg,
            sentiment_stddev: baseline.sentiment_stddev,
            period_days: baseline.period_days,
            data_points: baseline.data_points,
            calculated_at: baseline.calculated_at
        });
    } catch (error) {
        logger.error('Failed to get baseline', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve baseline statistics'
        });
    }
});

module.exports = router;
