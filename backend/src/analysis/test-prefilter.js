/**
 * Test Script for Statistical Pre-Filter (Phase 5A)
 * Tests pre-filter with both normal and anomalous data
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const { analyzeStatisticalAnomalies, getThresholds } = require('./statistical-prefilter');
const { getBaselineStatistics } = require('./baseline-calculator');
const queries = require('../database/queries');
const logger = require('../utils/logger');

/**
 * Test with current real data
 */
async function testWithCurrentData() {
    console.log('\n=== TEST 1: Pre-filter with Current Real Data ===\n');

    try {
        // Get latest data point
        const currentData = await queries.getLatestTimeSeriesData();

        if (!currentData) {
            console.error('❌ No current data available');
            return false;
        }

        console.log('Current Data:', {
            timestamp: currentData.timestamp,
            tvl_eth: currentData.tvl_eth,
            eeth_eth_ratio: currentData.eeth_eth_ratio,
            avg_gas_price_gwei: currentData.avg_gas_price_gwei,
            queue_size: currentData.queue_size
        });

        // Get baseline statistics
        const baselineStats = await getBaselineStatistics(30);

        console.log('\nBaseline Statistics:', {
            tvl_avg: baselineStats.tvl_avg.toFixed(2),
            tvl_stddev: baselineStats.tvl_stddev.toFixed(2),
            peg_avg: baselineStats.peg_avg.toFixed(6),
            gas_avg: baselineStats.gas_avg.toFixed(2),
            data_points: baselineStats.data_points
        });

        // Run pre-filter
        const result = await analyzeStatisticalAnomalies(currentData, baselineStats);

        console.log('\nPre-filter Result:', {
            isAnomalous: result.isAnomalous,
            shouldCallClaude: result.shouldCallClaude,
            maxSeverity: result.maxSeverity,
            triggerCount: result.triggers.length,
            summary: result.summary
        });

        if (result.triggers.length > 0) {
            console.log('\nTriggers Detected:');
            result.triggers.forEach((trigger, i) => {
                console.log(`\n  ${i + 1}. ${trigger.metric.toUpperCase()}`);
                console.log(`     Severity: ${trigger.severity}`);
                console.log(`     Reason: ${trigger.reason}`);
                if (trigger.zScore) console.log(`     Z-score: ${trigger.zScore}`);
                if (trigger.currentValue) console.log(`     Current: ${trigger.currentValue}`);
                if (trigger.baselineAvg) console.log(`     Baseline: ${trigger.baselineAvg}`);
            });
        } else {
            console.log('\n✓ No anomalies detected - all metrics within normal range');
        }

        console.log('\n✓ Test 1 Passed');
        return true;

    } catch (error) {
        console.error('❌ Test 1 Failed:', error.message);
        logger.error('Test with current data failed', { error: error.message });
        return false;
    }
}

/**
 * Test with injected anomaly
 */
async function testWithInjectedAnomaly(anomalyType = 'peg_deviation', value = 0.987) {
    console.log(`\n=== TEST 2: Pre-filter with Injected ${anomalyType.toUpperCase()} ===\n`);

    try {
        // Get latest data as template
        const currentData = await queries.getLatestTimeSeriesData();

        if (!currentData) {
            console.error('❌ No current data available');
            return false;
        }

        // Inject anomaly based on type
        const anomalousData = { ...currentData };

        switch (anomalyType) {
            case 'peg_deviation':
                anomalousData.eeth_eth_ratio = value; // 0.987 = 1.3% depeg
                console.log(`Injected peg deviation: ${value} (${((1 - value) * 100).toFixed(2)}% depeg)`);
                break;

            case 'tvl_spike':
                anomalousData.tvl_eth = currentData.tvl_eth * 1.15; // 15% increase
                console.log(`Injected TVL spike: +15% to ${anomalousData.tvl_eth.toFixed(2)} ETH`);
                break;

            case 'tvl_drop':
                anomalousData.tvl_eth = currentData.tvl_eth * 0.85; // 15% decrease
                console.log(`Injected TVL drop: -15% to ${anomalousData.tvl_eth.toFixed(2)} ETH`);
                break;

            case 'gas_spike':
                anomalousData.avg_gas_price_gwei = 25.0; // High gas
                console.log(`Injected gas spike: 25 gwei`);
                break;

            case 'queue_spike':
                anomalousData.queue_size = (currentData.queue_size || 100) * 5; // 5x increase
                console.log(`Injected queue spike: 5x to ${anomalousData.queue_size}`);
                break;

            default:
                console.error('❌ Unknown anomaly type');
                return false;
        }

        // Get baseline
        const baselineStats = await getBaselineStatistics(30);

        // Run pre-filter with anomalous data
        const result = await analyzeStatisticalAnomalies(anomalousData, baselineStats);

        console.log('\nPre-filter Result:', {
            isAnomalous: result.isAnomalous,
            shouldCallClaude: result.shouldCallClaude,
            maxSeverity: result.maxSeverity,
            triggerCount: result.triggers.length,
            summary: result.summary
        });

        if (result.triggers.length > 0) {
            console.log('\nTriggers Detected:');
            result.triggers.forEach((trigger, i) => {
                console.log(`\n  ${i + 1}. ${trigger.metric.toUpperCase()}`);
                console.log(`     Severity: ${trigger.severity}`);
                console.log(`     Reason: ${trigger.reason}`);
                if (trigger.zScore) console.log(`     Z-score: ${trigger.zScore}`);
                if (trigger.deviation) console.log(`     Deviation: ${trigger.deviation}`);
            });

            if (result.shouldCallClaude) {
                console.log('\n✓ Claude call WOULD be triggered (severity: ' + result.maxSeverity + ')');
            } else {
                console.log('\n⚠ Anomaly detected but not severe enough for Claude call');
            }
        } else {
            console.error('\n❌ Expected anomaly not detected!');
            return false;
        }

        console.log('\n✓ Test 2 Passed');
        return true;

    } catch (error) {
        console.error('❌ Test 2 Failed:', error.message);
        logger.error('Test with injected anomaly failed', { error: error.message });
        return false;
    }
}

/**
 * Test threshold configuration
 */
function testThresholds() {
    console.log('\n=== TEST 3: Threshold Configuration ===\n');

    const thresholds = getThresholds();

    console.log('Current Thresholds:');
    console.log('  Z-Score Thresholds:');
    console.log(`    HIGH: ±${thresholds.Z_SCORE_HIGH}`);
    console.log(`    MEDIUM: ±${thresholds.Z_SCORE_MEDIUM}`);
    console.log(`    LOW: ±${thresholds.Z_SCORE_LOW}`);
    console.log('  Peg Thresholds:');
    console.log(`    CRITICAL: ±${(thresholds.PEG_CRITICAL * 100).toFixed(1)}%`);
    console.log(`    HIGH: ±${(thresholds.PEG_HIGH * 100).toFixed(1)}%`);
    console.log(`    MEDIUM: ±${(thresholds.PEG_MEDIUM * 100).toFixed(1)}%`);
    console.log('  Gas Thresholds:');
    console.log(`    CRITICAL: ${thresholds.GAS_CRITICAL} gwei`);
    console.log(`    HIGH: ${thresholds.GAS_HIGH} gwei`);
    console.log(`    MEDIUM: ${thresholds.GAS_MEDIUM} gwei`);

    console.log('\n✓ Test 3 Passed');
    return true;
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  Statistical Pre-Filter Test Suite            ║');
    console.log('╚════════════════════════════════════════════════╝');

    const results = {
        passed: 0,
        failed: 0
    };

    // Test 1: Current data
    if (await testWithCurrentData()) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Test 2: Injected peg deviation
    if (await testWithInjectedAnomaly('peg_deviation', 0.987)) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Test 3: Thresholds
    if (testThresholds()) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  Test Summary                                  ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`✓ Passed: ${results.passed}`);
    console.log(`✗ Failed: ${results.failed}`);
    console.log(`Total: ${results.passed + results.failed}`);

    if (results.failed === 0) {
        console.log('\n🎉 All tests passed!\n');
    } else {
        console.log('\n⚠ Some tests failed. Check logs for details.\n');
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === '--use-current-data') {
    testWithCurrentData().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (command === '--inject-anomaly') {
    const anomalySpec = args[1] || 'peg_deviation=0.987';
    const [type, value] = anomalySpec.split('=');
    const anomalyValue = value ? parseFloat(value) : 0.987;

    testWithInjectedAnomaly(type, anomalyValue)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
} else {
    // Run all tests
    runAllTests();
}
