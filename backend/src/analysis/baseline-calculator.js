/**
 * Baseline Statistics Calculator (Phase 5D)
 * Calculates 30-day baseline statistics for anomaly detection
 * Caches results to avoid recalculation on every check
 */

const db = require('../database/db-connection');
const logger = require('../utils/logger');

/**
 * In-memory cache for baseline statistics
 * Recalculated every 5 minutes during active data collection
 */
let baselineCache = {
    data: null,
    calculatedAt: null
};

/**
 * Check if cached baseline is still valid
 * Cache expires after 5 minutes to allow fresh data during historical loading
 * @returns {boolean} True if cache is valid
 */
function isCacheValid() {
    if (!baselineCache.data || !baselineCache.calculatedAt) {
        return false;
    }

    const now = Date.now();
    const cacheAge = now - baselineCache.calculatedAt;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    return cacheAge < CACHE_TTL;
}

/**
 * Calculate baseline statistics from database
 * @param {number} days - Number of days to include in baseline (default: 30)
 * @returns {Promise<object>} Baseline statistics
 */
async function calculateBaselineFromDB(days = 30) {
    try {
        logger.info('Calculating baseline statistics', { days });

        // Get time-series baseline stats
        const timeSeriesQuery = `
            SELECT
                AVG(tvl_eth) as tvl_avg,
                STDDEV(tvl_eth) as tvl_stddev,
                MIN(tvl_eth) as tvl_min,
                MAX(tvl_eth) as tvl_max,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tvl_eth) as tvl_median,

                AVG(eeth_eth_ratio) as peg_avg,
                STDDEV(eeth_eth_ratio) as peg_stddev,
                MIN(eeth_eth_ratio) as peg_min,
                MAX(eeth_eth_ratio) as peg_max,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY eeth_eth_ratio) as peg_median,

                AVG(avg_gas_price_gwei) as gas_avg,
                STDDEV(avg_gas_price_gwei) as gas_stddev,
                MIN(avg_gas_price_gwei) as gas_min,
                MAX(avg_gas_price_gwei) as gas_max,

                AVG(queue_size) as queue_size_avg,
                STDDEV(queue_size) as queue_size_stddev,

                AVG(deposits_24h) as deposits_avg,
                STDDEV(deposits_24h) as deposits_stddev,

                AVG(withdrawals_24h) as withdrawals_avg,
                STDDEV(withdrawals_24h) as withdrawals_stddev,

                COUNT(*) as data_points
            FROM time_series_data
            WHERE timestamp > NOW() - INTERVAL '${days} days'
                AND data_source IN ('historical_loader', 'blockchain_collector')
                AND collection_status = 'success'
        `;

        const timeSeriesResult = await db.query(timeSeriesQuery);
        const timeSeriesStats = timeSeriesResult.rows[0];

        // Get sentiment baseline stats
        const sentimentQuery = `
            SELECT
                AVG(sentiment_score) as sentiment_avg,
                STDDEV(sentiment_score) as sentiment_stddev,
                COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count,
                COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
                COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral_count,
                COUNT(*) as total_tweets,
                AVG(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_pct,
                AVG(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_pct
            FROM twitter_sentiment
            WHERE collected_at > NOW() - INTERVAL '${days} days'
        `;

        const sentimentResult = await db.query(sentimentQuery);
        const sentimentStats = sentimentResult.rows[0];

        // Combine all statistics
        const baseline = {
            // TVL statistics
            tvl_avg: parseFloat(timeSeriesStats.tvl_avg) || 0,
            tvl_stddev: parseFloat(timeSeriesStats.tvl_stddev) || 0,
            tvl_min: parseFloat(timeSeriesStats.tvl_min) || 0,
            tvl_max: parseFloat(timeSeriesStats.tvl_max) || 0,
            tvl_median: parseFloat(timeSeriesStats.tvl_median) || 0,

            // Peg statistics
            peg_avg: parseFloat(timeSeriesStats.peg_avg) || 1.0,
            peg_stddev: parseFloat(timeSeriesStats.peg_stddev) || 0,
            peg_min: parseFloat(timeSeriesStats.peg_min) || 0,
            peg_max: parseFloat(timeSeriesStats.peg_max) || 0,
            peg_median: parseFloat(timeSeriesStats.peg_median) || 1.0,

            // Gas statistics
            gas_avg: parseFloat(timeSeriesStats.gas_avg) || 0,
            gas_stddev: parseFloat(timeSeriesStats.gas_stddev) || 0,
            gas_min: parseFloat(timeSeriesStats.gas_min) || 0,
            gas_max: parseFloat(timeSeriesStats.gas_max) || 0,

            // Queue statistics
            queue_size_avg: parseFloat(timeSeriesStats.queue_size_avg) || 0,
            queue_size_stddev: parseFloat(timeSeriesStats.queue_size_stddev) || 0,

            // Transaction statistics
            deposits_avg: parseFloat(timeSeriesStats.deposits_avg) || 0,
            deposits_stddev: parseFloat(timeSeriesStats.deposits_stddev) || 0,
            withdrawals_avg: parseFloat(timeSeriesStats.withdrawals_avg) || 0,
            withdrawals_stddev: parseFloat(timeSeriesStats.withdrawals_stddev) || 0,

            // Sentiment statistics
            sentiment_avg: parseFloat(sentimentStats.sentiment_avg) || 0,
            sentiment_stddev: parseFloat(sentimentStats.sentiment_stddev) || 0,
            negative_pct: parseFloat(sentimentStats.negative_pct) || 0,
            positive_pct: parseFloat(sentimentStats.positive_pct) || 0,
            total_tweets: parseInt(sentimentStats.total_tweets) || 0,

            // Metadata
            data_points: parseInt(timeSeriesStats.data_points) || 0,
            period_days: days,
            calculated_at: new Date()
        };

        logger.info('Baseline statistics calculated successfully', {
            data_points: baseline.data_points,
            total_tweets: baseline.total_tweets,
            tvl_avg: baseline.tvl_avg.toFixed(2),
            peg_avg: baseline.peg_avg.toFixed(6)
        });

        return baseline;

    } catch (error) {
        logger.error('Failed to calculate baseline statistics', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Get baseline statistics (with caching)
 * Returns cached data if calculated today, otherwise recalculates
 * @param {number} days - Number of days for baseline (default: 30)
 * @param {boolean} forceRefresh - Force recalculation even if cache valid
 * @returns {Promise<object>} Baseline statistics
 */
async function getBaselineStatistics(days = 30, forceRefresh = false) {
    try {
        // Return cached data if valid and not forcing refresh
        if (!forceRefresh && isCacheValid()) {
            logger.debug('Using cached baseline statistics');
            return baselineCache.data;
        }

        // Calculate new baseline
        logger.info('Recalculating baseline statistics', { days, forceRefresh });
        const baseline = await calculateBaselineFromDB(days);

        // Update cache with current timestamp (milliseconds)
        baselineCache = {
            data: baseline,
            calculatedAt: Date.now()
        };

        return baseline;

    } catch (error) {
        logger.error('Failed to get baseline statistics', { error: error.message });

        // Return cached data if available, even if stale
        if (baselineCache.data) {
            logger.warn('Using stale cached baseline due to error');
            return baselineCache.data;
        }

        throw error;
    }
}

/**
 * Calculate z-score for a value
 * @param {number} value - Current value
 * @param {number} mean - Baseline mean
 * @param {number} stddev - Baseline standard deviation
 * @returns {number} Z-score
 */
function calculateZScore(value, mean, stddev) {
    if (stddev === 0 || stddev === null || stddev === undefined) {
        return 0;
    }
    return (value - mean) / stddev;
}

/**
 * Clear the baseline cache (useful for testing)
 */
function clearCache() {
    baselineCache = {
        data: null,
        calculatedAt: null
    };
    logger.info('Baseline cache cleared');
}

/**
 * Get cache status (for debugging)
 * @returns {object} Cache status
 */
function getCacheStatus() {
    return {
        isCached: baselineCache.data !== null,
        calculatedAt: baselineCache.calculatedAt,
        isValid: isCacheValid(),
        age: baselineCache.calculatedAt
            ? Date.now() - new Date(baselineCache.calculatedAt).getTime()
            : null
    };
}

module.exports = {
    getBaselineStatistics,
    calculateBaselineFromDB,
    calculateZScore,
    clearCache,
    getCacheStatus
};
