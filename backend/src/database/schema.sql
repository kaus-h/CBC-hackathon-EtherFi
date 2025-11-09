-- EtherFi Anomaly Detection System - Database Schema
-- PostgreSQL Schema for storing blockchain data, anomalies, and sentiment analysis

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS twitter_sentiment CASCADE;
DROP TABLE IF EXISTS anomaly_triggers CASCADE;
DROP TABLE IF EXISTS anomalies CASCADE;
DROP TABLE IF EXISTS whale_wallets CASCADE;
DROP TABLE IF EXISTS time_series_data CASCADE;

-- Time series data table for tracking all metrics over time
CREATE TABLE time_series_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Core EtherFi metrics
    tvl_usd DECIMAL(20, 2),
    tvl_eth DECIMAL(20, 8),
    unique_stakers INTEGER,
    total_validators INTEGER,

    -- Transaction metrics
    deposits_24h INTEGER,
    withdrawals_24h INTEGER,
    deposit_volume_eth DECIMAL(20, 8),
    withdrawal_volume_eth DECIMAL(20, 8),

    -- Peg and price health
    eeth_eth_ratio DECIMAL(10, 8),
    eeth_price_usd DECIMAL(10, 2),

    -- Withdrawal queue metrics
    queue_size INTEGER,
    queue_eth_amount DECIMAL(20, 8),
    avg_queue_wait_hours DECIMAL(10, 2),

    -- Validator performance
    validator_apr DECIMAL(6, 4),
    total_rewards_eth DECIMAL(20, 8),

    -- Gas metrics
    avg_gas_price_gwei DECIMAL(10, 2),
    avg_tx_cost_usd DECIMAL(10, 2),

    -- Metadata
    data_source VARCHAR(50),
    collection_status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,

    -- Indexes for efficient querying
    CONSTRAINT unique_timestamp UNIQUE(timestamp)
);

-- Create indexes for time-series queries
CREATE INDEX idx_time_series_timestamp ON time_series_data(timestamp DESC);
-- Note: Partial index removed due to immutability constraint with NOW()

-- Whale wallets tracking table for top holders
CREATE TABLE whale_wallets (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Wallet metrics
    eeth_balance DECIMAL(20, 8) NOT NULL,
    eeth_balance_usd DECIMAL(20, 2),
    percentage_of_total DECIMAL(6, 4),
    rank_position INTEGER,

    -- Change tracking
    balance_change_24h DECIMAL(20, 8),
    balance_change_pct_24h DECIMAL(8, 4),

    -- Metadata
    first_seen TIMESTAMP,
    last_activity TIMESTAMP,
    is_contract BOOLEAN DEFAULT FALSE,
    label VARCHAR(100),

    -- Indexes
    CONSTRAINT unique_wallet_timestamp UNIQUE(wallet_address, timestamp)
);

-- Create indexes for whale wallet queries
CREATE INDEX idx_whale_address ON whale_wallets(wallet_address);
CREATE INDEX idx_whale_timestamp ON whale_wallets(timestamp DESC);
CREATE INDEX idx_whale_rank ON whale_wallets(rank_position, timestamp);

-- Anomalies table for storing detected anomalies
CREATE TABLE anomalies (
    id SERIAL PRIMARY KEY,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Anomaly classification
    anomaly_type VARCHAR(50) NOT NULL, -- whale_movement, peg_deviation, tvl_change, queue_spike, unusual_pattern
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    confidence DECIMAL(4, 3) NOT NULL, -- 0.000 to 1.000

    -- Description
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Analysis
    affected_metrics TEXT[], -- Array of metric names
    recommendation TEXT,
    historical_comparison TEXT,

    -- Claude AI analysis
    claude_analysis JSONB, -- Full Claude response
    raw_data JSONB, -- Raw data that triggered the anomaly

    -- Status tracking
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, false_positive
    resolved_at TIMESTAMP,
    resolution_notes TEXT,

    -- User interaction
    user_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    user_notes TEXT
);

-- Create indexes for anomaly queries
CREATE INDEX idx_anomalies_timestamp ON anomalies(detected_at DESC);
CREATE INDEX idx_anomalies_severity ON anomalies(severity);
CREATE INDEX idx_anomalies_type ON anomalies(anomaly_type);
CREATE INDEX idx_anomalies_status ON anomalies(status);
CREATE INDEX idx_anomalies_active ON anomalies(detected_at DESC) WHERE status = 'active';

-- Anomaly triggers table for storing pre-filter results
CREATE TABLE anomaly_triggers (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Pre-filter results
    is_anomalous BOOLEAN NOT NULL,
    should_call_claude BOOLEAN NOT NULL DEFAULT FALSE,

    -- Trigger details
    triggers JSONB, -- Array of trigger objects with metric, severity, z-score, etc.

    -- Statistics snapshot
    current_data JSONB, -- Current data point that was analyzed
    baseline_stats JSONB, -- Baseline statistics used for comparison

    -- Claude call tracking
    claude_called BOOLEAN DEFAULT FALSE,
    claude_call_timestamp TIMESTAMP,
    anomaly_id INTEGER REFERENCES anomalies(id),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for anomaly trigger queries
CREATE INDEX idx_anomaly_triggers_timestamp ON anomaly_triggers(timestamp DESC);
CREATE INDEX idx_anomaly_triggers_is_anomalous ON anomaly_triggers(is_anomalous);
CREATE INDEX idx_anomaly_triggers_claude_called ON anomaly_triggers(claude_called);

-- Twitter sentiment analysis table
CREATE TABLE twitter_sentiment (
    id SERIAL PRIMARY KEY,
    collected_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Tweet data
    tweet_id VARCHAR(50),
    tweet_text TEXT,
    author_username VARCHAR(50),
    author_followers INTEGER,

    -- Engagement metrics
    retweet_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,

    -- Sentiment analysis
    sentiment VARCHAR(20), -- positive, negative, neutral
    sentiment_score DECIMAL(4, 3), -- -1.000 to 1.000
    confidence DECIMAL(4, 3),

    -- Keywords and topics
    keywords TEXT[],
    mentions_etherfi BOOLEAN DEFAULT TRUE,

    -- Metadata
    tweet_created_at TIMESTAMP,
    language VARCHAR(10)
);

-- Create indexes for sentiment queries
CREATE INDEX idx_sentiment_timestamp ON twitter_sentiment(collected_at DESC);
CREATE INDEX idx_sentiment_score ON twitter_sentiment(sentiment_score);
CREATE INDEX idx_sentiment_type ON twitter_sentiment(sentiment);

-- Create a view for latest metrics (convenience)
CREATE VIEW latest_metrics AS
SELECT *
FROM time_series_data
ORDER BY timestamp DESC
LIMIT 1;

-- Create a view for active anomalies
CREATE VIEW active_anomalies AS
SELECT *
FROM anomalies
WHERE status = 'active'
ORDER BY severity DESC, detected_at DESC;

-- Create a view for top 20 current whales
CREATE VIEW current_top_whales AS
WITH latest_timestamp AS (
    SELECT MAX(timestamp) as max_ts
    FROM whale_wallets
)
SELECT w.*
FROM whale_wallets w
CROSS JOIN latest_timestamp lt
WHERE w.timestamp = lt.max_ts
ORDER BY w.rank_position ASC
LIMIT 20;

-- Function to calculate baseline statistics (for anomaly detection)
CREATE OR REPLACE FUNCTION get_baseline_stats(days INTEGER DEFAULT 30)
RETURNS TABLE (
    metric_name TEXT,
    avg_value DOUBLE PRECISION,
    stddev_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    median_value DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'tvl_eth'::TEXT,
        AVG(tvl_eth)::DOUBLE PRECISION,
        STDDEV(tvl_eth)::DOUBLE PRECISION,
        MIN(tvl_eth)::DOUBLE PRECISION,
        MAX(tvl_eth)::DOUBLE PRECISION,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tvl_eth)
    FROM time_series_data
    WHERE timestamp > NOW() - (days || ' days')::INTERVAL
        AND data_source IN ('historical_loader', 'blockchain_collector')
        AND tvl_eth > 0

    UNION ALL

    SELECT
        'eeth_eth_ratio'::TEXT,
        AVG(eeth_eth_ratio)::DOUBLE PRECISION,
        STDDEV(eeth_eth_ratio)::DOUBLE PRECISION,
        MIN(eeth_eth_ratio)::DOUBLE PRECISION,
        MAX(eeth_eth_ratio)::DOUBLE PRECISION,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY eeth_eth_ratio)
    FROM time_series_data
    WHERE timestamp > NOW() - (days || ' days')::INTERVAL
        AND data_source IN ('historical_loader', 'blockchain_collector')
        AND eeth_eth_ratio > 0

    UNION ALL

    SELECT
        'queue_size'::TEXT,
        AVG(queue_size)::DOUBLE PRECISION,
        STDDEV(queue_size)::DOUBLE PRECISION,
        MIN(queue_size)::DOUBLE PRECISION,
        MAX(queue_size)::DOUBLE PRECISION,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY queue_size)
    FROM time_series_data
    WHERE timestamp > NOW() - (days || ' days')::INTERVAL
        AND data_source IN ('historical_loader', 'blockchain_collector');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

-- Insert initial test row to verify schema
INSERT INTO time_series_data (
    tvl_usd,
    tvl_eth,
    unique_stakers,
    data_source,
    collection_status
) VALUES (
    0.00,
    0.00,
    0,
    'schema_initialization',
    'success'
);

-- Verify test row
SELECT * FROM time_series_data WHERE data_source = 'schema_initialization';
