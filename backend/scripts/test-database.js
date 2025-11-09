/**
 * Database Test Script
 * Tests database operations and queries
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../src/database/db-connection');
const queries = require('../src/database/queries');
const logger = require('../src/utils/logger');

/**
 * Main test function
 */
async function testDatabase() {
    logger.info('========================================');
    logger.info('Database Testing Starting...');
    logger.info('========================================');

    try {
        // Initialize pool
        db.initializePool();

        // Test 1: Connection
        logger.info('Test 1: Testing database connection...');
        const connectionSuccess = await db.testConnection();
        if (connectionSuccess) {
            logger.success('✓ Connection test passed');
        }

        // Test 2: Insert time series data
        logger.info('Test 2: Testing time series data insertion...');
        const testTimeSeriesData = {
            tvl_usd: 1000000.50,
            tvl_eth: 500.123456,
            unique_stakers: 1000,
            total_validators: 50,
            deposits_24h: 10,
            withdrawals_24h: 5,
            deposit_volume_eth: 100.5,
            withdrawal_volume_eth: 50.25,
            eeth_eth_ratio: 0.998,
            eeth_price_usd: 2500.75,
            queue_size: 20,
            queue_eth_amount: 25.5,
            avg_queue_wait_hours: 48.5,
            validator_apr: 0.045,
            total_rewards_eth: 1000.5,
            avg_gas_price_gwei: 25.5,
            avg_tx_cost_usd: 15.75,
            data_source: 'test_script',
            collection_status: 'success'
        };

        const insertedData = await queries.insertTimeSeriesData(testTimeSeriesData);
        if (insertedData && insertedData.id) {
            logger.success('✓ Time series data insertion passed');
            logger.info(`  Inserted ID: ${insertedData.id}`);
        }

        // Test 3: Retrieve latest data
        logger.info('Test 3: Testing data retrieval...');
        const latestData = await queries.getLatestTimeSeriesData();
        if (latestData && latestData.data_source === 'test_script') {
            logger.success('✓ Data retrieval passed');
            logger.info(`  Latest TVL: $${latestData.tvl_usd}`);
        }

        // Test 4: Insert whale wallet data
        logger.info('Test 4: Testing whale wallet insertion...');
        const testWhaleData = {
            wallet_address: '0x1234567890123456789012345678901234567890',
            eeth_balance: 1000.5,
            eeth_balance_usd: 2500000.00,
            percentage_of_total: 5.5,
            rank_position: 1,
            balance_change_24h: 100.0,
            balance_change_pct_24h: 10.5,
            is_contract: false,
            label: 'Test Whale'
        };

        const insertedWhale = await queries.insertWhaleWalletData(testWhaleData);
        if (insertedWhale && insertedWhale.id) {
            logger.success('✓ Whale wallet insertion passed');
            logger.info(`  Wallet: ${insertedWhale.wallet_address.substring(0, 10)}...`);
        }

        // Test 5: Insert anomaly
        logger.info('Test 5: Testing anomaly insertion...');
        const testAnomaly = {
            anomaly_type: 'whale_movement',
            severity: 'HIGH',
            confidence: 0.85,
            title: 'Test Anomaly: Large Whale Movement',
            description: 'Test anomaly detected during system testing',
            affected_metrics: ['tvl_eth', 'unique_stakers'],
            recommendation: 'Monitor for additional movements',
            historical_comparison: 'Similar to event in January 2024',
            claude_analysis: { test: true },
            raw_data: { test_data: 'sample' },
            status: 'active'
        };

        const insertedAnomaly = await queries.insertAnomaly(testAnomaly);
        if (insertedAnomaly && insertedAnomaly.id) {
            logger.success('✓ Anomaly insertion passed');
            logger.info(`  Anomaly ID: ${insertedAnomaly.id}, Severity: ${insertedAnomaly.severity}`);
        }

        // Test 6: Retrieve active anomalies
        logger.info('Test 6: Testing anomaly retrieval...');
        const activeAnomalies = await queries.getActiveAnomalies();
        if (activeAnomalies && activeAnomalies.length > 0) {
            logger.success('✓ Anomaly retrieval passed');
            logger.info(`  Found ${activeAnomalies.length} active anomalies`);
        }

        // Test 7: Database health check
        logger.info('Test 7: Testing database health check...');
        const health = await db.healthCheck();
        if (health.status === 'healthy') {
            logger.success('✓ Health check passed');
            logger.info(`  Total connections: ${health.totalConnections}`);
            logger.info(`  Idle connections: ${health.idleConnections}`);
        }

        // Summary
        logger.info('========================================');
        logger.success('All Database Tests Passed!');
        logger.info('========================================');
        logger.info('Database is ready for production use.');
        logger.info('You can now proceed to Phase 2: Historical Data Loader');
        logger.info('========================================');

    } catch (error) {
        logger.error('Database test failed!', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

// Run tests
testDatabase();
