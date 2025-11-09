/**
 * Test Script for Claude Analyzer (Phase 5B)
 * Tests Claude API integration and response parsing
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const { analyzeWithClaude, constructPrompt, parseClaudeResponse, getConfig } = require('./claude-analyzer');
const { getBaselineStatistics } = require('./baseline-calculator');
const { analyzeStatisticalAnomalies } = require('./statistical-prefilter');
const queries = require('../database/queries');
const logger = require('../utils/logger');

/**
 * Test API configuration
 */
function testConfiguration() {
    console.log('\n=== TEST 1: Configuration Check ===\n');

    const config = getConfig();

    console.log('Claude API Configuration:');
    console.log(`  Model: ${config.model}`);
    console.log(`  Max Tokens: ${config.maxTokens}`);
    console.log(`  Max Retries: ${config.maxRetries}`);
    console.log(`  API Key Present: ${config.hasApiKey ? '✓' : '✗'}`);

    if (!config.hasApiKey) {
        console.error('\n❌ ANTHROPIC_API_KEY not found in environment!');
        console.error('Please set ANTHROPIC_API_KEY in .env file');
        return false;
    }

    console.log('\n✓ Test 1 Passed');
    return true;
}

/**
 * Test prompt construction
 */
async function testPromptConstruction() {
    console.log('\n=== TEST 2: Prompt Construction ===\n');

    try {
        // Get sample data
        const currentData = await queries.getLatestTimeSeriesData();
        const recentData = await queries.getTimeSeriesData(2);
        const baselineStats = await getBaselineStatistics(30);

        // Create sample trigger data
        const triggerData = {
            isAnomalous: true,
            shouldCallClaude: true,
            triggers: [
                {
                    metric: 'peg',
                    severity: 'HIGH',
                    currentValue: '0.987000',
                    targetValue: '1.000000',
                    deviation: '1.300%',
                    reason: 'eETH trading below peg (1.300% discount)'
                }
            ],
            maxSeverity: 'HIGH',
            timestamp: new Date()
        };

        // Construct prompt
        const prompt = constructPrompt(triggerData, recentData.slice(0, 10), baselineStats);

        console.log('Prompt Length:', prompt.length, 'characters');
        console.log('\nPrompt Preview (first 500 chars):');
        console.log(prompt.substring(0, 500) + '...\n');

        // Check key sections
        const hasProtocolContext = prompt.includes('EtherFi allows users to stake ETH');
        const hasBaseline = prompt.includes('BASELINE DATA');
        const hasTriggers = prompt.includes('STATISTICAL TRIGGERS DETECTED');
        const hasRecentData = prompt.includes('RECENT DATA');
        const hasInstructions = prompt.includes('YOUR TASK');

        console.log('Prompt Sections:');
        console.log(`  Protocol Context: ${hasProtocolContext ? '✓' : '✗'}`);
        console.log(`  Baseline Data: ${hasBaseline ? '✓' : '✗'}`);
        console.log(`  Triggers: ${hasTriggers ? '✓' : '✗'}`);
        console.log(`  Recent Data: ${hasRecentData ? '✓' : '✗'}`);
        console.log(`  Instructions: ${hasInstructions ? '✓' : '✗'}`);

        if (hasProtocolContext && hasBaseline && hasTriggers && hasRecentData && hasInstructions) {
            console.log('\n✓ Test 2 Passed');
            return true;
        } else {
            console.error('\n❌ Test 2 Failed: Missing required prompt sections');
            return false;
        }

    } catch (error) {
        console.error('❌ Test 2 Failed:', error.message);
        return false;
    }
}

/**
 * Test response parsing
 */
function testResponseParsing() {
    console.log('\n=== TEST 3: Response Parsing ===\n');

    try {
        // Sample valid response
        const sampleResponse = JSON.stringify({
            anomalies: [
                {
                    type: 'peg_deviation',
                    severity: 'HIGH',
                    confidence: 0.85,
                    title: 'eETH Peg Deviation Detected',
                    description: 'The eETH token is trading 1.3% below its ETH peg, indicating potential sell pressure.',
                    affectedMetrics: ['peg', 'tvl'],
                    recommendation: 'Monitor closely for further depeg or recovery',
                    historicalComparison: 'Similar to minor stETH depegs during market stress',
                    correlations: ['peg', 'sentiment'],
                    timeframe: '12-24 hours',
                    riskLevel: 'Medium'
                }
            ],
            overallAssessment: 'Protocol showing minor stress signals',
            monitoringPriority: 'Watch peg recovery and TVL stability',
            falseAlarmProbability: 0.15
        }, null, 2);

        console.log('Testing with sample response...\n');

        const parsed = parseClaudeResponse(sampleResponse);

        console.log('Parsed Successfully:', {
            anomalyCount: parsed.anomalies.length,
            firstAnomaly: {
                type: parsed.anomalies[0].type,
                severity: parsed.anomalies[0].severity,
                confidence: parsed.anomalies[0].confidence,
                title: parsed.anomalies[0].title
            }
        });

        // Test with markdown-wrapped response
        const markdownResponse = '```json\n' + sampleResponse + '\n```';
        console.log('\nTesting with markdown-wrapped response...');

        const parsedMarkdown = parseClaudeResponse(markdownResponse);
        console.log('Markdown parsing successful:', parsedMarkdown.anomalies.length, 'anomalies');

        console.log('\n✓ Test 3 Passed');
        return true;

    } catch (error) {
        console.error('❌ Test 3 Failed:', error.message);
        return false;
    }
}

/**
 * Test full Claude analysis with real trigger
 */
async function testWithRealTrigger() {
    console.log('\n=== TEST 4: Full Claude Analysis (REAL API CALL) ===\n');
    console.log('⚠ WARNING: This will make a REAL API call to Claude!\n');

    try {
        // Get current data
        const currentData = await queries.getLatestTimeSeriesData();
        const baselineStats = await getBaselineStatistics(30);

        // Create injected anomaly for testing
        const testData = { ...currentData };
        testData.eeth_eth_ratio = 0.987; // 1.3% depeg

        // Run pre-filter
        const prefilterResult = await analyzeStatisticalAnomalies(testData, baselineStats);

        console.log('Pre-filter Result:');
        console.log(`  Anomalous: ${prefilterResult.isAnomalous}`);
        console.log(`  Should Call Claude: ${prefilterResult.shouldCallClaude}`);
        console.log(`  Triggers: ${prefilterResult.triggers.length}`);

        if (!prefilterResult.shouldCallClaude) {
            console.log('\n⚠ Pre-filter did not trigger Claude call');
            console.log('  Adjusting test data to force trigger...\n');

            // Force more severe anomaly
            testData.eeth_eth_ratio = 0.98; // 2% depeg
            testData.avg_gas_price_gwei = 25; // High gas

            const forcedResult = await analyzeStatisticalAnomalies(testData, baselineStats);
            if (!forcedResult.shouldCallClaude) {
                console.log('✗ Unable to trigger Claude call even with forced anomaly');
                return false;
            }

            console.log('Forced pre-filter result:');
            console.log(`  Triggers: ${forcedResult.triggers.length}`);
            console.log(`  Max Severity: ${forcedResult.maxSeverity}\n`);
        }

        // Get recent data
        const recentData = await queries.getTimeSeriesData(2);

        console.log('Calling Claude API...\n');

        // Call Claude
        const result = await analyzeWithClaude(
            prefilterResult,
            recentData.slice(0, 20),
            baselineStats
        );

        if (!result.success) {
            console.error('❌ Claude analysis failed:', result.error);
            return false;
        }

        console.log('✓ Claude API call successful!\n');
        console.log('Analysis Result:');
        console.log(`  Anomalies Detected: ${result.anomalies.length}`);
        console.log(`  Overall Assessment: ${result.analysis.overallAssessment}`);
        console.log(`  Monitoring Priority: ${result.analysis.monitoringPriority}`);

        if (result.anomalies.length > 0) {
            console.log('\nFirst Anomaly:');
            const first = result.anomalies[0];
            console.log(`  ID: ${first.id}`);
            console.log(`  Type: ${first.anomaly_type}`);
            console.log(`  Severity: ${first.severity}`);
            console.log(`  Confidence: ${first.confidence}`);
            console.log(`  Title: ${first.title}`);
            console.log(`  Description: ${first.description}`);
        }

        console.log('\n✓ Test 4 Passed');
        return true;

    } catch (error) {
        console.error('❌ Test 4 Failed:', error.message);
        logger.error('Claude analysis test failed', { error: error.message, stack: error.stack });
        return false;
    }
}

/**
 * Run all tests
 */
async function runAllTests(skipRealApiCall = false) {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  Claude Analyzer Test Suite                   ║');
    console.log('╚════════════════════════════════════════════════╝');

    const results = {
        passed: 0,
        failed: 0
    };

    // Test 1: Configuration
    if (testConfiguration()) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Test 2: Prompt construction
    if (await testPromptConstruction()) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Test 3: Response parsing
    if (testResponseParsing()) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Test 4: Real API call (optional)
    if (!skipRealApiCall) {
        console.log('\n⏳ Proceeding with real API call in 3 seconds...');
        console.log('   Press Ctrl+C to cancel\n');
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (await testWithRealTrigger()) {
            results.passed++;
        } else {
            results.failed++;
        }
    } else {
        console.log('\n⏩ Skipping real API call test\n');
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
const skipRealCall = args.includes('--no-api-call');
const realCallOnly = args.includes('--with-real-trigger');

if (realCallOnly) {
    testWithRealTrigger().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
    runAllTests(skipRealCall);
}
