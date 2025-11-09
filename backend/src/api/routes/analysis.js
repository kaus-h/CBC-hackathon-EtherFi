/**
 * Analysis Routes - Manual Claude-powered analysis
 */

const express = require('express');
const router = express.Router();
const queries = require('../../database/queries');
const { analyzeWithClaude } = require('../../analysis/claude-analyzer');
const { getBaselineStatistics } = require('../../analysis/baseline-calculator');
const logger = require('../../utils/logger');

/**
 * POST /api/analysis/generate
 * Generate a comprehensive anomaly analysis report using Claude
 */
router.post('/generate', async (req, res) => {
    try {
        logger.info('Manual analysis report requested');

        // 1. Get current data
        const currentData = await queries.getLatestTimeSeriesData();
        if (!currentData) {
            return res.status(404).json({
                success: false,
                error: 'No data available',
                message: 'No recent data to analyze'
            });
        }

        // 2. Get baseline statistics (force refresh for manual analysis)
        const baselineStats = await getBaselineStatistics(30, true); // Force refresh

        // Require minimum 12 data points (1 hour) for meaningful statistical analysis
        const MIN_DATA_POINTS = 12;
        if (!baselineStats || baselineStats.data_points < MIN_DATA_POINTS) {
            const currentPoints = baselineStats?.data_points || 0;
            const hoursNeeded = Math.ceil((MIN_DATA_POINTS - currentPoints) * 5 / 60); // 5 min intervals

            return res.status(400).json({
                success: false,
                error: 'Insufficient baseline data',
                message: `Need at least ${MIN_DATA_POINTS} data points (1 hour) for reliable analysis. Currently have ${currentPoints} points. Please wait ~${hoursNeeded} more hour(s) for data collection.`,
                currentDataPoints: currentPoints,
                requiredDataPoints: MIN_DATA_POINTS,
                estimatedWaitHours: hoursNeeded
            });
        }

        // Log data availability
        logger.info(`Analysis using ${baselineStats.data_points} data points from ${baselineStats.period_days} day period`);

        // 3. Get recent historical data (last 24 hours)
        const recentData = await queries.getTimeSeriesData(24);

        // 4. Calculate deviations for the report
        // For single data point, baseline avg equals current value, so deviation is 0
        const tvlDeviation = currentData.tvl_eth && baselineStats.tvl_avg && baselineStats.tvl_avg > 0
            ? ((currentData.tvl_eth - baselineStats.tvl_avg) / baselineStats.tvl_avg) * 100
            : 0;

        const pegDeviation = Math.abs((currentData.eeth_eth_ratio || 1.0) - 1.0) * 100;

        const gasDeviation = currentData.avg_gas_price_gwei && baselineStats.gas_avg && baselineStats.gas_avg > 0
            ? ((currentData.avg_gas_price_gwei - baselineStats.gas_avg) / baselineStats.gas_avg) * 100
            : 0;

        // Log the calculated deviations
        logger.debug('Deviations calculated', {
            tvl: `${tvlDeviation.toFixed(2)}%`,
            peg: `${pegDeviation.toFixed(3)}%`,
            gas: `${gasDeviation.toFixed(1)}%`,
            dataPoints: baselineStats.data_points
        });

        // 5. Create trigger data for Claude
        const limitedData = baselineStats.data_points < 10;
        const triggerData = {
            timestamp: currentData.timestamp,
            isAnomalous: Math.abs(tvlDeviation) > 5 || pegDeviation > 0.3 || Math.abs(gasDeviation) > 20,
            shouldCallClaude: true,
            maxSeverity: limitedData ? 'LOW' : 'MEDIUM',
            limitedBaseline: limitedData,
            baselineDataPoints: baselineStats.data_points,
            triggers: [
                {
                    metric: 'tvl',
                    severity: Math.abs(tvlDeviation) > 10 ? 'HIGH' : Math.abs(tvlDeviation) > 5 ? 'MEDIUM' : 'LOW',
                    currentValue: parseFloat(currentData.tvl_eth || 0).toFixed(2),
                    baselineAvg: parseFloat(baselineStats.tvl_avg || 0).toFixed(2),
                    deviation: `${tvlDeviation >= 0 ? '+' : ''}${tvlDeviation.toFixed(2)}%`,
                    reason: tvlDeviation > 0
                        ? `TVL is ${tvlDeviation.toFixed(2)}% above baseline`
                        : `TVL is ${Math.abs(tvlDeviation).toFixed(2)}% below baseline`
                },
                {
                    metric: 'peg',
                    severity: pegDeviation > 1 ? 'CRITICAL' : pegDeviation > 0.5 ? 'HIGH' : pegDeviation > 0.3 ? 'MEDIUM' : 'LOW',
                    currentValue: parseFloat(currentData.eeth_eth_ratio || 1.0).toFixed(6),
                    baselineAvg: '1.000000',
                    deviation: `${pegDeviation.toFixed(3)}%`,
                    reason: `eETH/ETH peg is ${pegDeviation.toFixed(3)}% from 1:1`
                },
                {
                    metric: 'gas',
                    severity: Math.abs(gasDeviation) > 50 ? 'HIGH' : Math.abs(gasDeviation) > 20 ? 'MEDIUM' : 'LOW',
                    currentValue: parseFloat(currentData.avg_gas_price_gwei || 0).toFixed(4),
                    baselineAvg: parseFloat(baselineStats.gas_avg || 0).toFixed(4),
                    deviation: `${gasDeviation >= 0 ? '+' : ''}${gasDeviation.toFixed(1)}%`,
                    reason: gasDeviation > 0
                        ? `Gas price is ${gasDeviation.toFixed(1)}% above baseline`
                        : `Gas price is ${Math.abs(gasDeviation).toFixed(1)}% below baseline`
                }
            ],
            summary: `Analysis of EtherFi protocol at ${new Date(currentData.timestamp).toISOString()}`
        };

        // 6. Call Claude for analysis
        logger.info('Calling Claude for analysis report');
        const claudeResult = await analyzeWithClaude(
            triggerData,
            recentData.slice(0, 20), // Last 20 data points
            baselineStats
        );

        if (!claudeResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Claude analysis failed',
                message: claudeResult.error
            });
        }

        // 7. Return comprehensive report
        res.json({
            success: true,
            generated_at: new Date().toISOString(),
            current_state: {
                timestamp: currentData.timestamp,
                tvl_eth: parseFloat(currentData.tvl_eth),
                tvl_usd: parseFloat(currentData.tvl_usd),
                eeth_eth_ratio: parseFloat(currentData.eeth_eth_ratio),
                avg_gas_price_gwei: parseFloat(currentData.avg_gas_price_gwei),
                unique_stakers: parseInt(currentData.unique_stakers),
                total_validators: parseInt(currentData.total_validators)
            },
            baseline_comparison: {
                tvl_deviation_pct: tvlDeviation.toFixed(2),
                peg_deviation_pct: pegDeviation.toFixed(3),
                gas_deviation_pct: gasDeviation.toFixed(1),
                baseline_period_days: baselineStats.period_days,
                baseline_data_points: baselineStats.data_points
            },
            analysis: claudeResult.analysis,
            anomalies: claudeResult.anomalies || []
        });

    } catch (error) {
        logger.error('Failed to generate analysis report', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: 'Analysis generation failed',
            message: error.message
        });
    }
});

module.exports = router;
