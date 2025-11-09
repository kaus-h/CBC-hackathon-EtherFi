/**
 * Anomaly Detection Orchestrator (Phase 5C)
 * Main coordinator that ties together pre-filter, Claude analysis, and storage
 * Called after every data collection cycle (every 5 minutes)
 */

const { getBaselineStatistics } = require('./baseline-calculator');
const { analyzeStatisticalAnomalies } = require('./statistical-prefilter');
const { analyzeWithClaude } = require('./claude-analyzer');
const db = require('../database/db-connection');
const queries = require('../database/queries');
const logger = require('../utils/logger');

/**
 * Rate limiting configuration
 * Prevents calling Claude too frequently even if anomalies detected
 */
const RATE_LIMIT = {
    minIntervalMs: 5 * 60 * 1000, // 5 minutes minimum between Claude calls (reduced for testing)
    lastClaudeCall: null
};

/**
 * Store pre-filter trigger result in database
 * @param {object} prefilterResult - Pre-filter analysis result
 * @param {object} currentData - Current data point
 * @param {object} baselineStats - Baseline statistics
 * @returns {Promise<object>} Inserted trigger record
 */
async function storeTriggerResult(prefilterResult, currentData, baselineStats) {
    try {
        const query = `
            INSERT INTO anomaly_triggers (
                timestamp,
                is_anomalous,
                should_call_claude,
                triggers,
                current_data,
                baseline_stats,
                claude_called
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            prefilterResult.timestamp,
            prefilterResult.isAnomalous,
            prefilterResult.shouldCallClaude,
            JSON.stringify(prefilterResult.triggers),
            JSON.stringify({
                tvl_eth: currentData.tvl_eth,
                eeth_eth_ratio: currentData.eeth_eth_ratio,
                avg_gas_price_gwei: currentData.avg_gas_price_gwei,
                queue_size: currentData.queue_size,
                withdrawals_24h: currentData.withdrawals_24h
            }),
            JSON.stringify({
                tvl_avg: baselineStats.tvl_avg,
                peg_avg: baselineStats.peg_avg,
                gas_avg: baselineStats.gas_avg
            }),
            false // Claude not called yet
        ];

        const result = await db.query(query, values);
        return result.rows[0];

    } catch (error) {
        logger.error('Failed to store trigger result', {
            error: error.message
        });
        // Don't throw - this shouldn't stop the detection flow
        return null;
    }
}

/**
 * Update trigger record after Claude analysis
 * @param {number} triggerId - Trigger record ID
 * @param {number} anomalyId - Created anomaly ID
 * @returns {Promise<void>}
 */
async function updateTriggerWithAnomaly(triggerId, anomalyId) {
    try {
        const query = `
            UPDATE anomaly_triggers
            SET claude_called = true,
                claude_call_timestamp = NOW(),
                anomaly_id = $1
            WHERE id = $2
        `;

        await db.query(query, [anomalyId, triggerId]);

    } catch (error) {
        logger.error('Failed to update trigger record', {
            error: error.message,
            triggerId,
            anomalyId
        });
    }
}

/**
 * Get timestamp of last Claude API call
 * @returns {Promise<Date|null>} Last call timestamp or null
 */
async function getLastClaudeCallTime() {
    try {
        // Check in-memory cache first
        if (RATE_LIMIT.lastClaudeCall) {
            return RATE_LIMIT.lastClaudeCall;
        }

        // Query database for last call
        const query = `
            SELECT claude_call_timestamp
            FROM anomaly_triggers
            WHERE claude_called = true
            ORDER BY claude_call_timestamp DESC
            LIMIT 1
        `;

        const result = await db.query(query);

        if (result.rows.length > 0 && result.rows[0].claude_call_timestamp) {
            const lastCall = new Date(result.rows[0].claude_call_timestamp);
            RATE_LIMIT.lastClaudeCall = lastCall;
            return lastCall;
        }

        return null;

    } catch (error) {
        logger.error('Failed to get last Claude call time', {
            error: error.message
        });
        return null;
    }
}

/**
 * Check if Claude can be called based on rate limiting
 * @returns {Promise<object>} Rate limit status
 */
async function checkRateLimit() {
    const lastCall = await getLastClaudeCallTime();

    if (!lastCall) {
        return {
            allowed: true,
            reason: 'No previous Claude calls found'
        };
    }

    const timeSinceLastCall = Date.now() - lastCall.getTime();
    const isAllowed = timeSinceLastCall >= RATE_LIMIT.minIntervalMs;

    if (isAllowed) {
        return {
            allowed: true,
            timeSinceLastCall,
            reason: 'Rate limit satisfied'
        };
    }

    const timeRemaining = RATE_LIMIT.minIntervalMs - timeSinceLastCall;
    const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));

    return {
        allowed: false,
        timeSinceLastCall,
        timeRemaining,
        minutesRemaining,
        reason: `Rate limited. ${minutesRemaining} minutes until next allowed call`
    };
}

/**
 * Get recent sentiment summary
 * @returns {Promise<object|null>} Sentiment summary
 */
async function getRecentSentiment() {
    try {
        const sentimentData = await queries.getSentimentSummary(24); // Last 24 hours

        if (sentimentData && sentimentData.total_tweets > 0) {
            return {
                avg_sentiment: parseFloat(sentimentData.avg_sentiment),
                negative_pct: sentimentData.negative_count / sentimentData.total_tweets,
                positive_pct: sentimentData.positive_count / sentimentData.total_tweets,
                total_tweets: parseInt(sentimentData.total_tweets)
            };
        }

        return null;

    } catch (error) {
        logger.warn('Failed to get sentiment data', { error: error.message });
        return null;
    }
}

/**
 * Main anomaly detection function
 * Orchestrates the entire detection flow
 * @returns {Promise<object>} Detection result
 */
async function detectAnomalies() {
    const startTime = Date.now();

    try {
        logger.info('Starting anomaly detection cycle');

        // 1. Get latest data point
        const currentData = await queries.getLatestTimeSeriesData();

        if (!currentData) {
            logger.warn('No current data available for anomaly detection');
            return {
                success: false,
                reason: 'No data available'
            };
        }

        logger.debug('Current data retrieved', {
            timestamp: currentData.timestamp,
            tvl_eth: currentData.tvl_eth,
            peg: currentData.eeth_eth_ratio
        });

        // 2. Get baseline statistics
        const baselineStats = await getBaselineStatistics(30);

        // Require minimum 48 data points (4 hours) for reliable automatic detection
        const MIN_DATA_POINTS = 48;
        if (!baselineStats || baselineStats.data_points < MIN_DATA_POINTS) {
            logger.warn('Insufficient baseline data for anomaly detection', {
                data_points: baselineStats?.data_points || 0,
                minimum_required: MIN_DATA_POINTS,
                hours_of_data: Math.round((baselineStats?.data_points || 0) * 5 / 60)
            });
            return {
                success: false,
                reason: `Insufficient baseline data (need at least ${MIN_DATA_POINTS} data points / 4 hours)`
            };
        }

        // Log warning if data is limited but proceed anyway
        if (baselineStats.data_points < 144) { // Less than 12 hours
            logger.warn('Limited baseline data - anomaly detection may be less accurate', {
                data_points: baselineStats.data_points,
                recommended: 144,
                hours_of_data: Math.round(baselineStats.data_points * 5 / 60)
            });
        }

        // 3. Get recent sentiment data
        const sentimentData = await getRecentSentiment();

        // 4. Run statistical pre-filter
        const prefilterResult = await analyzeStatisticalAnomalies(
            currentData,
            baselineStats,
            sentimentData
        );

        // 5. Store pre-filter result in database
        const triggerRecord = await storeTriggerResult(
            prefilterResult,
            currentData,
            baselineStats
        );

        logger.info('Pre-filter analysis completed', {
            isAnomalous: prefilterResult.isAnomalous,
            shouldCallClaude: prefilterResult.shouldCallClaude,
            triggerCount: prefilterResult.triggers.length,
            maxSeverity: prefilterResult.maxSeverity
        });

        // 6. Check if Claude should be called
        if (!prefilterResult.shouldCallClaude) {
            logger.debug('No Claude call needed - metrics within acceptable ranges');
            return {
                success: true,
                prefilterResult,
                claudeCalled: false,
                reason: 'No significant anomalies detected',
                duration: Date.now() - startTime
            };
        }

        // 7. Check rate limiting
        const rateLimitStatus = await checkRateLimit();

        if (!rateLimitStatus.allowed) {
            logger.info('Claude call rate limited', {
                reason: rateLimitStatus.reason,
                minutesRemaining: rateLimitStatus.minutesRemaining
            });

            return {
                success: true,
                prefilterResult,
                claudeCalled: false,
                rateLimited: true,
                reason: rateLimitStatus.reason,
                minutesRemaining: rateLimitStatus.minutesRemaining,
                duration: Date.now() - startTime
            };
        }

        // 8. Get recent data for Claude analysis (last 20 points ~ 100 minutes)
        const recentData = await queries.getTimeSeriesData(2); // Last 2 hours
        const recentDataSample = recentData.slice(0, 20);

        logger.info('Calling Claude for analysis', {
            recentDataPoints: recentDataSample.length
        });

        // 9. Call Claude for analysis
        const claudeResult = await analyzeWithClaude(
            prefilterResult,
            recentDataSample,
            baselineStats
        );

        // 10. Update rate limit timestamp
        RATE_LIMIT.lastClaudeCall = new Date();

        // 11. Update trigger record with anomaly IDs
        if (claudeResult.success && claudeResult.anomalies && claudeResult.anomalies.length > 0) {
            const firstAnomalyId = claudeResult.anomalies[0].id;
            if (triggerRecord) {
                await updateTriggerWithAnomaly(triggerRecord.id, firstAnomalyId);
            }

            logger.info('Claude analysis successful', {
                anomaliesDetected: claudeResult.anomalies.length,
                overallAssessment: claudeResult.analysis?.overallAssessment
            });

            // ====== PHASE 7: WEBSOCKET BROADCAST ======
            // Broadcast anomaly alerts to connected clients
            try {
                const { broadcastAnomalyDetected } = require('../api/websocket');
                claudeResult.anomalies.forEach(anomaly => {
                    broadcastAnomalyDetected(anomaly);
                });
                logger.debug('Broadcasted anomaly alerts to WebSocket clients');
            } catch (wsError) {
                logger.debug('WebSocket broadcast skipped (server may not be running)');
            }
            // ====== END PHASE 7 ======
        } else {
            logger.warn('Claude analysis completed but returned no anomalies or failed', {
                success: claudeResult.success,
                error: claudeResult.error
            });
        }

        const duration = Date.now() - startTime;
        logger.info('Anomaly detection cycle completed', {
            duration: `${duration}ms`,
            claudeCalled: true,
            anomaliesFound: claudeResult.anomalies?.length || 0
        });

        return {
            success: true,
            prefilterResult,
            claudeCalled: true,
            claudeResult,
            duration
        };

    } catch (error) {
        logger.error('Anomaly detection failed', {
            error: error.message,
            stack: error.stack,
            duration: Date.now() - startTime
        });

        return {
            success: false,
            error: error.message,
            duration: Date.now() - startTime
        };
    }
}

/**
 * Get detection statistics (for monitoring)
 * @returns {Promise<object>} Detection statistics
 */
async function getDetectionStats() {
    try {
        const query = `
            SELECT
                COUNT(*) FILTER (WHERE is_anomalous = true) as anomalous_count,
                COUNT(*) FILTER (WHERE is_anomalous = false) as normal_count,
                COUNT(*) FILTER (WHERE claude_called = true) as claude_calls,
                MAX(timestamp) as last_check,
                MAX(claude_call_timestamp) as last_claude_call
            FROM anomaly_triggers
            WHERE timestamp > NOW() - INTERVAL '24 hours'
        `;

        const result = await db.query(query);
        const stats = result.rows[0];

        return {
            last24Hours: {
                anomalousChecks: parseInt(stats.anomalous_count) || 0,
                normalChecks: parseInt(stats.normal_count) || 0,
                claudeCalls: parseInt(stats.claude_calls) || 0,
                lastCheck: stats.last_check ? stats.last_check.toISOString() : null,
                lastClaudeCall: stats.last_claude_call ? stats.last_claude_call.toISOString() : null
            },
            rateLimit: {
                minIntervalMinutes: RATE_LIMIT.minIntervalMs / (60 * 1000),
                lastCall: RATE_LIMIT.lastClaudeCall
            }
        };

    } catch (error) {
        logger.error('Failed to get detection stats', { error: error.message });
        return null;
    }
}

module.exports = {
    detectAnomalies,
    getDetectionStats,
    checkRateLimit,
    getLastClaudeCallTime
};
