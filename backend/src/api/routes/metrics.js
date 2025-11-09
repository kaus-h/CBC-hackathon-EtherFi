/**
 * Metrics Routes
 */

const express = require('express');
const router = express.Router();
const queries = require('../../database/queries');
const logger = require('../../utils/logger');

/**
 * GET /api/metrics/current
 * Get current metrics
 */
router.get('/current', async (req, res) => {
    try {
        const metrics = await queries.getLatestTimeSeriesData();

        if (!metrics) {
            return res.status(404).json({
                error: 'No data available',
                message: 'No metrics data found'
            });
        }

        res.json({
            tvl_eth: parseFloat(metrics.tvl_eth) || 0,
            tvl_usd: parseFloat(metrics.tvl_usd) || 0,
            eeth_eth_ratio: parseFloat(metrics.eeth_eth_ratio) || 1.0,
            eeth_price_usd: parseFloat(metrics.eeth_price_usd) || 0,
            unique_stakers: parseInt(metrics.unique_stakers) || 0,
            total_validators: parseInt(metrics.total_validators) || 0,
            avg_gas_price_gwei: parseFloat(metrics.avg_gas_price_gwei) || 0,
            avg_tx_cost_usd: parseFloat(metrics.avg_tx_cost_usd) || 0,
            queue_size: parseInt(metrics.queue_size) || 0,
            queue_eth_amount: parseFloat(metrics.queue_eth_amount) || 0,
            deposits_24h: parseInt(metrics.deposits_24h) || 0,
            withdrawals_24h: parseInt(metrics.withdrawals_24h) || 0,
            timestamp: metrics.timestamp,
            data_source: metrics.data_source
        });
    } catch (error) {
        logger.error('Failed to get current metrics', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve current metrics'
        });
    }
});

/**
 * GET /api/metrics/historical?days=7&metric=tvl_eth
 * Get historical metrics
 */
router.get('/historical', async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 7, 30);
        const metric = req.query.metric || 'all';
        const hours = days * 24;

        const data = await queries.getTimeSeriesData(hours);

        if (!data || data.length === 0) {
            return res.status(404).json({
                error: 'No data available',
                message: `No historical data found for the past ${days} days`
            });
        }

        // Transform data based on metric
        let result;
        if (metric === 'all') {
            result = data.map(point => ({
                timestamp: point.timestamp,
                tvl_eth: parseFloat(point.tvl_eth) || 0,
                tvl_usd: parseFloat(point.tvl_usd) || 0,
                eeth_eth_ratio: parseFloat(point.eeth_eth_ratio) || 1.0,
                avg_gas_price_gwei: parseFloat(point.avg_gas_price_gwei) || 0,
                unique_stakers: parseInt(point.unique_stakers) || 0,
                total_validators: parseInt(point.total_validators) || 0,
                queue_size: parseInt(point.queue_size) || 0,
                deposits_24h: parseInt(point.deposits_24h) || 0,
                withdrawals_24h: parseInt(point.withdrawals_24h) || 0,
                validator_apr: parseFloat(point.validator_apr) || 0
            }));
        } else {
            result = data.map(point => ({
                timestamp: point.timestamp,
                value: parseFloat(point[metric]) || 0
            }));
        }

        // Calculate summary
        const values = result.map(r => metric === 'all' ? r.tvl_eth : r.value);
        const summary = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            current: values[values.length - 1],
            count: values.length
        };

        res.json({
            metric,
            period_days: days,
            data: result,
            summary
        });
    } catch (error) {
        logger.error('Failed to get historical metrics', { error: error.message });
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to retrieve historical metrics'
        });
    }
});

module.exports = router;
