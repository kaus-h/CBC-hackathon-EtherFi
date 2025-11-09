/**
 * Statistical Pre-Filter Engine (Phase 5A)
 * Runs after every data collection cycle (every 5 minutes)
 * Determines if current state is anomalous enough to trigger Claude analysis
 */

const { getBaselineStatistics, calculateZScore } = require('./baseline-calculator');
const logger = require('../utils/logger');

/**
 * Threshold constants for anomaly detection
 */
const THRESHOLDS = {
    // Z-score thresholds
    Z_SCORE_HIGH: 2.5,          // High deviation (2.5 standard deviations)
    Z_SCORE_MEDIUM: 2.0,        // Medium deviation
    Z_SCORE_LOW: 1.5,           // Low deviation

    // Peg deviation thresholds
    PEG_CRITICAL: 0.01,         // 1% depeg - CRITICAL
    PEG_HIGH: 0.005,            // 0.5% depeg - HIGH
    PEG_MEDIUM: 0.003,          // 0.3% depeg - MEDIUM

    // Gas price thresholds (gwei)
    GAS_CRITICAL: 50,           // Extreme congestion
    GAS_HIGH: 20,               // High congestion
    GAS_MEDIUM: 10,             // Moderate congestion

    // Sentiment thresholds
    SENTIMENT_NEGATIVE_PCT: 0.4,  // 40% negative tweets
    SENTIMENT_SCORE_LOW: -0.3,    // Average sentiment below -0.3

    // Multi-signal correlation
    MIN_CORRELATED_SIGNALS: 2    // Minimum number of correlated anomalies
};

/**
 * Analyze current data for statistical anomalies
 * @param {object} currentData - Latest data point from blockchain collector
 * @param {object} baselineStats - 30-day baseline statistics
 * @param {object} sentimentData - Recent sentiment summary (optional)
 * @returns {Promise<object>} Analysis result with triggers
 */
async function analyzeStatisticalAnomalies(currentData, baselineStats, sentimentData = null) {
    try {
        logger.debug('Running statistical pre-filter', {
            timestamp: currentData.timestamp
        });

        const triggers = [];
        let maxSeverity = null;

        // 1. TVL ANALYSIS
        if (currentData.tvl_eth && baselineStats.tvl_avg) {
            const tvlZScore = calculateZScore(
                currentData.tvl_eth,
                baselineStats.tvl_avg,
                baselineStats.tvl_stddev
            );

            const tvlChange = ((currentData.tvl_eth - baselineStats.tvl_avg) / baselineStats.tvl_avg) * 100;

            if (Math.abs(tvlZScore) >= THRESHOLDS.Z_SCORE_HIGH) {
                const severity = Math.abs(tvlZScore) >= 3.0 ? 'CRITICAL' : 'HIGH';
                triggers.push({
                    metric: 'tvl',
                    severity,
                    zScore: tvlZScore.toFixed(2),
                    currentValue: currentData.tvl_eth.toFixed(2),
                    baselineAvg: baselineStats.tvl_avg.toFixed(2),
                    deviation: `${tvlChange >= 0 ? '+' : ''}${tvlChange.toFixed(2)}%`,
                    reason: tvlZScore > 0
                        ? `TVL significantly higher than baseline (${tvlChange.toFixed(2)}% increase)`
                        : `TVL significantly lower than baseline (${Math.abs(tvlChange).toFixed(2)}% decrease)`
                });
                maxSeverity = updateMaxSeverity(maxSeverity, severity);
            } else if (Math.abs(tvlZScore) >= THRESHOLDS.Z_SCORE_MEDIUM) {
                triggers.push({
                    metric: 'tvl',
                    severity: 'MEDIUM',
                    zScore: tvlZScore.toFixed(2),
                    currentValue: currentData.tvl_eth.toFixed(2),
                    baselineAvg: baselineStats.tvl_avg.toFixed(2),
                    deviation: `${tvlChange >= 0 ? '+' : ''}${tvlChange.toFixed(2)}%`,
                    reason: `TVL moderately deviating from baseline`
                });
                maxSeverity = updateMaxSeverity(maxSeverity, 'MEDIUM');
            }
        }

        // 2. PEG HEALTH ANALYSIS
        if (currentData.eeth_eth_ratio) {
            const pegDeviation = Math.abs(currentData.eeth_eth_ratio - 1.0);
            const pegDeviationPct = pegDeviation * 100;

            let pegSeverity = null;
            if (pegDeviation >= THRESHOLDS.PEG_CRITICAL) {
                pegSeverity = 'CRITICAL';
            } else if (pegDeviation >= THRESHOLDS.PEG_HIGH) {
                pegSeverity = 'HIGH';
            } else if (pegDeviation >= THRESHOLDS.PEG_MEDIUM) {
                pegSeverity = 'MEDIUM';
            }

            if (pegSeverity) {
                triggers.push({
                    metric: 'peg',
                    severity: pegSeverity,
                    currentValue: currentData.eeth_eth_ratio.toFixed(6),
                    targetValue: '1.000000',
                    deviation: `${pegDeviationPct.toFixed(3)}%`,
                    reason: currentData.eeth_eth_ratio > 1.0
                        ? `eETH trading above peg (${pegDeviationPct.toFixed(3)}% premium)`
                        : `eETH trading below peg (${pegDeviationPct.toFixed(3)}% discount)`
                });
                maxSeverity = updateMaxSeverity(maxSeverity, pegSeverity);
            }

            // Also check z-score for peg
            if (baselineStats.peg_avg && baselineStats.peg_stddev) {
                const pegZScore = calculateZScore(
                    currentData.eeth_eth_ratio,
                    baselineStats.peg_avg,
                    baselineStats.peg_stddev
                );

                if (Math.abs(pegZScore) >= THRESHOLDS.Z_SCORE_HIGH && !pegSeverity) {
                    triggers.push({
                        metric: 'peg_zscore',
                        severity: 'MEDIUM',
                        zScore: pegZScore.toFixed(2),
                        currentValue: currentData.eeth_eth_ratio.toFixed(6),
                        baselineAvg: baselineStats.peg_avg.toFixed(6),
                        reason: `Peg ratio deviating from historical pattern`
                    });
                    maxSeverity = updateMaxSeverity(maxSeverity, 'MEDIUM');
                }
            }
        }

        // 3. GAS PRICE ANALYSIS
        if (currentData.avg_gas_price_gwei) {
            let gasSeverity = null;
            if (currentData.avg_gas_price_gwei >= THRESHOLDS.GAS_CRITICAL) {
                gasSeverity = 'CRITICAL';
            } else if (currentData.avg_gas_price_gwei >= THRESHOLDS.GAS_HIGH) {
                gasSeverity = 'HIGH';
            } else if (currentData.avg_gas_price_gwei >= THRESHOLDS.GAS_MEDIUM) {
                gasSeverity = 'MEDIUM';
            }

            if (gasSeverity) {
                const gasChange = baselineStats.gas_avg
                    ? ((currentData.avg_gas_price_gwei - baselineStats.gas_avg) / baselineStats.gas_avg * 100)
                    : 0;

                triggers.push({
                    metric: 'gas',
                    severity: gasSeverity,
                    currentValue: currentData.avg_gas_price_gwei.toFixed(2),
                    baselineAvg: baselineStats.gas_avg?.toFixed(2) || 'N/A',
                    deviation: gasChange ? `${gasChange >= 0 ? '+' : ''}${gasChange.toFixed(0)}%` : 'N/A',
                    reason: `Elevated gas prices indicating network congestion`
                });
                maxSeverity = updateMaxSeverity(maxSeverity, gasSeverity);
            }
        }

        // 4. WITHDRAWAL QUEUE ANALYSIS
        if (currentData.queue_size && baselineStats.queue_size_avg) {
            const queueZScore = calculateZScore(
                currentData.queue_size,
                baselineStats.queue_size_avg,
                baselineStats.queue_size_stddev
            );

            if (queueZScore >= THRESHOLDS.Z_SCORE_HIGH) {
                const severity = queueZScore >= 3.0 ? 'HIGH' : 'MEDIUM';
                const queueChange = ((currentData.queue_size - baselineStats.queue_size_avg) / baselineStats.queue_size_avg) * 100;

                triggers.push({
                    metric: 'queue',
                    severity,
                    zScore: queueZScore.toFixed(2),
                    currentValue: currentData.queue_size,
                    baselineAvg: baselineStats.queue_size_avg.toFixed(0),
                    deviation: `${queueChange >= 0 ? '+' : ''}${queueChange.toFixed(0)}%`,
                    reason: `Withdrawal queue significantly larger than baseline`
                });
                maxSeverity = updateMaxSeverity(maxSeverity, severity);
            }
        }

        // 5. TRANSACTION VOLUME ANALYSIS
        if (currentData.withdrawals_24h && baselineStats.withdrawals_avg) {
            const withdrawalZScore = calculateZScore(
                currentData.withdrawals_24h,
                baselineStats.withdrawals_avg,
                baselineStats.withdrawals_stddev
            );

            if (withdrawalZScore >= THRESHOLDS.Z_SCORE_HIGH) {
                const severity = withdrawalZScore >= 3.0 ? 'HIGH' : 'MEDIUM';
                triggers.push({
                    metric: 'withdrawals',
                    severity,
                    zScore: withdrawalZScore.toFixed(2),
                    currentValue: currentData.withdrawals_24h,
                    baselineAvg: baselineStats.withdrawals_avg.toFixed(0),
                    reason: `Unusually high withdrawal activity`
                });
                maxSeverity = updateMaxSeverity(maxSeverity, severity);
            }
        }

        // 6. SENTIMENT ANALYSIS
        if (sentimentData) {
            const negativePct = sentimentData.negative_pct || 0;
            const avgSentiment = sentimentData.avg_sentiment || 0;

            if (negativePct >= THRESHOLDS.SENTIMENT_NEGATIVE_PCT ||
                avgSentiment <= THRESHOLDS.SENTIMENT_SCORE_LOW) {

                triggers.push({
                    metric: 'sentiment',
                    severity: negativePct >= 0.6 ? 'HIGH' : 'MEDIUM',
                    currentValue: avgSentiment.toFixed(3),
                    negativePct: (negativePct * 100).toFixed(1) + '%',
                    reason: `Negative sentiment spike detected in social media`
                });
                maxSeverity = updateMaxSeverity(maxSeverity, negativePct >= 0.6 ? 'HIGH' : 'MEDIUM');
            }
        }

        // 7. MULTI-SIGNAL CORRELATION DETECTION
        const uniqueMetrics = new Set(triggers.map(t => t.metric));
        const hasMultipleSignals = uniqueMetrics.size >= THRESHOLDS.MIN_CORRELATED_SIGNALS;

        if (hasMultipleSignals) {
            // Upgrade severity if multiple correlated signals
            const correlatedMetrics = Array.from(uniqueMetrics);
            triggers.push({
                metric: 'correlation',
                severity: 'HIGH',
                correlatedMetrics,
                reason: `Multiple metrics showing anomalous behavior simultaneously (${correlatedMetrics.join(', ')})`
            });
            maxSeverity = updateMaxSeverity(maxSeverity, 'HIGH');
        }

        // Determine if Claude should be called
        const isAnomalous = triggers.length > 0;
        const shouldCallClaude = isAnomalous && (
            maxSeverity === 'CRITICAL' ||
            maxSeverity === 'HIGH' ||
            hasMultipleSignals
        );

        const result = {
            isAnomalous,
            shouldCallClaude,
            triggers,
            maxSeverity: maxSeverity || 'NONE',
            timestamp: currentData.timestamp || new Date(),
            summary: generateSummary(triggers, isAnomalous)
        };

        logger.info('Statistical pre-filter completed', {
            isAnomalous,
            shouldCallClaude,
            triggerCount: triggers.length,
            maxSeverity: result.maxSeverity
        });

        return result;

    } catch (error) {
        logger.error('Statistical pre-filter failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Update maximum severity level
 * @param {string} currentMax - Current max severity
 * @param {string} newSeverity - New severity to compare
 * @returns {string} Updated max severity
 */
function updateMaxSeverity(currentMax, newSeverity) {
    const severityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };

    if (!currentMax) return newSeverity;

    const currentLevel = severityLevels[currentMax] || 0;
    const newLevel = severityLevels[newSeverity] || 0;

    return newLevel > currentLevel ? newSeverity : currentMax;
}

/**
 * Generate human-readable summary
 * @param {Array} triggers - Array of triggers
 * @param {boolean} isAnomalous - Whether anomalies detected
 * @returns {string} Summary message
 */
function generateSummary(triggers, isAnomalous) {
    if (!isAnomalous) {
        return 'All metrics within normal range';
    }

    const metrics = triggers.map(t => t.metric).filter(m => m !== 'correlation');
    const uniqueMetrics = [...new Set(metrics)];

    if (uniqueMetrics.length === 1) {
        return `${uniqueMetrics[0].toUpperCase()} anomaly detected`;
    } else {
        return `Multiple anomalies detected: ${uniqueMetrics.join(', ')}`;
    }
}

/**
 * Get current threshold configuration
 * @returns {object} Current thresholds
 */
function getThresholds() {
    return { ...THRESHOLDS };
}

module.exports = {
    analyzeStatisticalAnomalies,
    getThresholds,
    THRESHOLDS
};
