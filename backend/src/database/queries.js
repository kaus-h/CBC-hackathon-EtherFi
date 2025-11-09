/**
 * Database Queries Module
 * Contains all SQL queries for the EtherFi Anomaly Detection System
 */

const db = require('./db-connection');

/**
 * TIME SERIES DATA QUERIES
 */

/**
 * Insert new time series data point
 * @param {object} data Time series data
 * @returns {Promise<object>} Inserted row
 */
async function insertTimeSeriesData(data) {
    const query = `
        INSERT INTO time_series_data (
            timestamp, tvl_usd, tvl_eth, unique_stakers, total_validators,
            deposits_24h, withdrawals_24h, deposit_volume_eth, withdrawal_volume_eth,
            eeth_eth_ratio, eeth_price_usd, queue_size, queue_eth_amount,
            avg_queue_wait_hours, validator_apr, total_rewards_eth,
            avg_gas_price_gwei, avg_tx_cost_usd, data_source, collection_status, error_message
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        RETURNING *
    `;

    const values = [
        data.timestamp || new Date(),
        data.tvl_usd,
        data.tvl_eth,
        data.unique_stakers,
        data.total_validators,
        data.deposits_24h,
        data.withdrawals_24h,
        data.deposit_volume_eth,
        data.withdrawal_volume_eth,
        data.eeth_eth_ratio,
        data.eeth_price_usd,
        data.queue_size,
        data.queue_eth_amount,
        data.avg_queue_wait_hours,
        data.validator_apr,
        data.total_rewards_eth,
        data.avg_gas_price_gwei,
        data.avg_tx_cost_usd,
        data.data_source || 'blockchain_collector',
        data.collection_status || 'success',
        data.error_message || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
}

/**
 * Get latest time series data
 * @returns {Promise<object>} Latest data point
 */
async function getLatestTimeSeriesData() {
    const query = `
        SELECT * FROM time_series_data
        ORDER BY timestamp DESC
        LIMIT 1
    `;
    const result = await db.query(query);
    return result.rows[0];
}

/**
 * Get time series data for a specific time range
 * @param {number} hours Number of hours to look back
 * @returns {Promise<Array>} Array of data points
 */
async function getTimeSeriesData(hours = 24) {
    const query = `
        SELECT * FROM time_series_data
        WHERE timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC
    `;
    const result = await db.query(query);
    return result.rows;
}

/**
 * Get time series data for a specific date range
 * @param {Date} startDate Start date
 * @param {Date} endDate End date
 * @returns {Promise<Array>} Array of data points
 */
async function getTimeSeriesDataRange(startDate, endDate) {
    const query = `
        SELECT * FROM time_series_data
        WHERE timestamp BETWEEN $1 AND $2
        ORDER BY timestamp ASC
    `;
    const result = await db.query(query, [startDate, endDate]);
    return result.rows;
}

/**
 * Get baseline statistics for anomaly detection
 * @param {number} days Number of days for baseline
 * @returns {Promise<object>} Baseline statistics
 */
async function getBaselineStatistics(days = 30) {
    const query = `SELECT * FROM get_baseline_stats($1)`;
    const result = await db.query(query, [days]);

    // Convert to object format
    const stats = {};
    result.rows.forEach(row => {
        stats[row.metric_name] = {
            avg: parseFloat(row.avg_value),
            stddev: parseFloat(row.stddev_value),
            min: parseFloat(row.min_value),
            max: parseFloat(row.max_value),
            median: parseFloat(row.median_value)
        };
    });

    return stats;
}

/**
 * WHALE WALLET QUERIES
 */

/**
 * Insert or update whale wallet data
 * @param {object} walletData Wallet data
 * @returns {Promise<object>} Inserted/updated row
 */
async function insertWhaleWalletData(walletData) {
    const query = `
        INSERT INTO whale_wallets (
            wallet_address, timestamp, eeth_balance, eeth_balance_usd,
            percentage_of_total, rank_position, balance_change_24h,
            balance_change_pct_24h, first_seen, last_activity, is_contract, label
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (wallet_address, timestamp)
        DO UPDATE SET
            eeth_balance = EXCLUDED.eeth_balance,
            eeth_balance_usd = EXCLUDED.eeth_balance_usd,
            percentage_of_total = EXCLUDED.percentage_of_total,
            rank_position = EXCLUDED.rank_position,
            balance_change_24h = EXCLUDED.balance_change_24h,
            balance_change_pct_24h = EXCLUDED.balance_change_pct_24h,
            last_activity = EXCLUDED.last_activity
        RETURNING *
    `;

    const values = [
        walletData.wallet_address,
        walletData.timestamp || new Date(),
        walletData.eeth_balance,
        walletData.eeth_balance_usd,
        walletData.percentage_of_total,
        walletData.rank_position,
        walletData.balance_change_24h || 0,
        walletData.balance_change_pct_24h || 0,
        walletData.first_seen || new Date(),
        walletData.last_activity || new Date(),
        walletData.is_contract || false,
        walletData.label || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
}

/**
 * Get current top whales
 * @param {number} limit Number of top whales to return
 * @returns {Promise<Array>} Array of whale data
 */
async function getCurrentTopWhales(limit = 20) {
    const query = `
        WITH latest_timestamp AS (
            SELECT MAX(timestamp) as max_ts
            FROM whale_wallets
        )
        SELECT w.*
        FROM whale_wallets w
        CROSS JOIN latest_timestamp lt
        WHERE w.timestamp = lt.max_ts
        ORDER BY w.rank_position ASC
        LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
}

/**
 * Get whale wallet history
 * @param {string} walletAddress Wallet address
 * @param {number} hours Hours to look back
 * @returns {Promise<Array>} Wallet history
 */
async function getWhaleWalletHistory(walletAddress, hours = 168) {
    const query = `
        SELECT * FROM whale_wallets
        WHERE wallet_address = $1
        AND timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC
    `;
    const result = await db.query(query, [walletAddress]);
    return result.rows;
}

/**
 * ANOMALY QUERIES
 */

/**
 * Insert detected anomaly
 * @param {object} anomaly Anomaly data
 * @returns {Promise<object>} Inserted anomaly
 */
async function insertAnomaly(anomaly) {
    const query = `
        INSERT INTO anomalies (
            detected_at, anomaly_type, severity, confidence, title, description,
            affected_metrics, recommendation, historical_comparison,
            claude_analysis, raw_data, status
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING *
    `;

    const values = [
        anomaly.detected_at || new Date(),
        anomaly.anomaly_type,
        anomaly.severity,
        anomaly.confidence,
        anomaly.title,
        anomaly.description,
        anomaly.affected_metrics || [],
        anomaly.recommendation || null,
        anomaly.historical_comparison || null,
        anomaly.claude_analysis || null,
        anomaly.raw_data || null,
        anomaly.status || 'active'
    ];

    const result = await db.query(query, values);
    return result.rows[0];
}

/**
 * Get recent anomalies
 * @param {number} hours Hours to look back
 * @param {string} status Filter by status
 * @returns {Promise<Array>} Array of anomalies
 */
async function getRecentAnomalies(hours = 24, status = null) {
    let query = `
        SELECT * FROM anomalies
        WHERE detected_at > NOW() - INTERVAL '${hours} hours'
    `;

    if (status) {
        query += ` AND status = '${status}'`;
    }

    query += ` ORDER BY severity DESC, detected_at DESC`;

    const result = await db.query(query);
    return result.rows;
}

/**
 * Get active anomalies
 * @returns {Promise<Array>} Array of active anomalies
 */
async function getActiveAnomalies() {
    const query = `
        SELECT * FROM active_anomalies
    `;
    const result = await db.query(query);
    return result.rows;
}

/**
 * Update anomaly status
 * @param {number} id Anomaly ID
 * @param {string} status New status
 * @param {string} notes Resolution notes
 * @returns {Promise<object>} Updated anomaly
 */
async function updateAnomalyStatus(id, status, notes = null) {
    const query = `
        UPDATE anomalies
        SET status = $1,
            resolved_at = CASE WHEN $1 IN ('resolved', 'false_positive') THEN NOW() ELSE resolved_at END,
            resolution_notes = COALESCE($2, resolution_notes)
        WHERE id = $3
        RETURNING *
    `;
    const result = await db.query(query, [status, notes, id]);
    return result.rows[0];
}

/**
 * TWITTER SENTIMENT QUERIES
 */

/**
 * Insert twitter sentiment data
 * @param {object} sentimentData Sentiment data
 * @returns {Promise<object>} Inserted row
 */
async function insertTwitterSentiment(sentimentData) {
    const query = `
        INSERT INTO twitter_sentiment (
            collected_at, tweet_id, tweet_text, author_username, author_followers,
            retweet_count, like_count, reply_count, sentiment, sentiment_score,
            confidence, keywords, mentions_etherfi, tweet_created_at, language
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
    `;

    const values = [
        sentimentData.collected_at || new Date(),
        sentimentData.tweet_id,
        sentimentData.tweet_text,
        sentimentData.author_username,
        sentimentData.author_followers,
        sentimentData.retweet_count || 0,
        sentimentData.like_count || 0,
        sentimentData.reply_count || 0,
        sentimentData.sentiment,
        sentimentData.sentiment_score,
        sentimentData.confidence,
        sentimentData.keywords || [],
        sentimentData.mentions_etherfi !== false,
        sentimentData.tweet_created_at,
        sentimentData.language || 'en'
    ];

    const result = await db.query(query, values);
    return result.rows[0];
}

/**
 * Get recent sentiment data
 * @param {number} hours Hours to look back
 * @returns {Promise<Array>} Sentiment data
 */
async function getRecentSentiment(hours = 24) {
    const query = `
        SELECT * FROM twitter_sentiment
        WHERE collected_at > NOW() - INTERVAL '${hours} hours'
        ORDER BY collected_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
}

/**
 * Get sentiment summary
 * @param {number} hours Hours to look back
 * @returns {Promise<object>} Sentiment summary
 */
async function getSentimentSummary(hours = 24) {
    const query = `
        SELECT
            COUNT(*) as total_tweets,
            AVG(sentiment_score) as avg_sentiment,
            COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count,
            COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
            COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral_count,
            SUM(retweet_count) as total_retweets,
            SUM(like_count) as total_likes
        FROM twitter_sentiment
        WHERE collected_at > NOW() - INTERVAL '${hours} hours'
    `;
    const result = await db.query(query);
    return result.rows[0];
}

module.exports = {
    // Time series queries
    insertTimeSeriesData,
    getLatestTimeSeriesData,
    getTimeSeriesData,
    getTimeSeriesDataRange,
    getBaselineStatistics,

    // Whale wallet queries
    insertWhaleWalletData,
    getCurrentTopWhales,
    getWhaleWalletHistory,

    // Anomaly queries
    insertAnomaly,
    getRecentAnomalies,
    getActiveAnomalies,
    updateAnomalyStatus,

    // Twitter sentiment queries
    insertTwitterSentiment,
    getRecentSentiment,
    getSentimentSummary
};
