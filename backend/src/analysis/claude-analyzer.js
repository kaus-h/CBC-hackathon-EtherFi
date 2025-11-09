/**
 * Claude Analysis Engine (Phase 5B)
 * Sends anomaly data to Claude API for expert analysis
 * Only called when statistical pre-filter triggers anomaly
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const Anthropic = require('@anthropic-ai/sdk');
const db = require('../database/db-connection');
const queries = require('../database/queries');
const logger = require('../utils/logger');

/**
 * Initialize Anthropic client
 */
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * API Configuration
 */
const CONFIG = {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 2000,
    maxRetries: 3,
    retryDelay: 2000, // 2 seconds
    timeout: 30000    // 30 seconds
};

/**
 * Construct prompt for Claude analysis
 * @param {object} triggerData - Pre-filter trigger data
 * @param {Array} recentData - Recent time-series data points
 * @param {object} baselineStats - Baseline statistics
 * @returns {string} Formatted prompt
 */
function constructPrompt(triggerData, recentData, baselineStats) {
    // Format triggers for display
    const triggersText = triggerData.triggers.map(t => {
        return `  - ${t.metric.toUpperCase()}: ${t.severity} severity
    Current: ${t.currentValue || 'N/A'}
    ${t.baselineAvg ? `Baseline: ${t.baselineAvg}` : ''}
    ${t.zScore ? `Z-score: ${t.zScore}` : ''}
    Reason: ${t.reason}`;
    }).join('\n\n');

    // Format recent data (last 10 points for readability)
    const recentDataSample = recentData.slice(0, 10).map(d => {
        return {
            timestamp: d.timestamp,
            tvl_eth: d.tvl_eth ? parseFloat(d.tvl_eth).toFixed(2) : null,
            peg: d.eeth_eth_ratio ? parseFloat(d.eeth_eth_ratio).toFixed(6) : null,
            gas_gwei: d.avg_gas_price_gwei ? parseFloat(d.avg_gas_price_gwei).toFixed(2) : null,
            queue_size: d.queue_size,
            withdrawals: d.withdrawals_24h
        };
    });

    const prompt = `You are an autonomous anomaly detection system for EtherFi, a major Ethereum liquid staking protocol.

PROTOCOL CONTEXT:
EtherFi allows users to stake ETH and receive eETH (liquid staking token) that maintains ~1:1 peg with ETH.
Current TVL: ~$9.4B USD. Users can deposit, withdraw, and use eETH in DeFi while earning staking rewards.

BASELINE DATA (30-day normal patterns):
- TVL Average: ${baselineStats.tvl_avg.toFixed(2)} ETH (StdDev: ±${baselineStats.tvl_stddev.toFixed(2)})
- TVL Range: ${baselineStats.tvl_min.toFixed(2)} - ${baselineStats.tvl_max.toFixed(2)} ETH
- Peg Average: ${baselineStats.peg_avg.toFixed(6)} (StdDev: ±${baselineStats.peg_stddev.toFixed(6)})
- Peg Range: ${baselineStats.peg_min.toFixed(6)} - ${baselineStats.peg_max.toFixed(6)}
- Gas Average: ${baselineStats.gas_avg.toFixed(2)} gwei (StdDev: ±${baselineStats.gas_stddev.toFixed(2)})
- Sentiment Average: ${baselineStats.sentiment_avg.toFixed(3)} score (${(baselineStats.positive_pct * 100).toFixed(1)}% positive)
- Data Period: ${baselineStats.period_days} days (${baselineStats.data_points} data points)

STATISTICAL TRIGGERS DETECTED:
${triggersText}

RECENT DATA (last 10 data points):
${JSON.stringify(recentDataSample, null, 2)}

YOUR TASK:
Analyze this situation as an expert DeFi risk analyst. Consider:

1. Pattern Analysis: What is breaking from baseline? Is this within normal variance or significant?

2. Multi-Signal Correlation: Are multiple metrics moving together? What does this suggest?

3. Contextual Assessment: Given EtherFi's role as a liquid staking protocol:
   - Is this likely user behavior, market movement, or protocol issue?
   - Does this pattern match historical DeFi events (Luna, Celsius, USDC depeg, etc.)?

4. Severity Classification:
   - LOW: Minor deviation, likely normal variance
   - MEDIUM: Notable pattern, worth monitoring
   - HIGH: Significant anomaly, potential risk
   - CRITICAL: Protocol-threatening pattern, immediate attention

5. Confidence Level: Based on data quality, pattern clarity, and historical precedent

6. Actionable Recommendations: What should protocol users consider?

Return ONLY valid JSON (no markdown, no explanations outside JSON):
{
  "anomalies": [
    {
      "type": "peg_deviation|tvl_change|whale_movement|sentiment_shift|gas_spike|multi_signal|queue_spike|unusual_pattern",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "confidence": 0.75,
      "title": "Brief descriptive title (max 60 chars)",
      "description": "Detailed 2-3 sentence explanation of what's happening and why it matters",
      "affectedMetrics": ["tvl", "peg", "sentiment"],
      "recommendation": "Specific actionable advice for users",
      "historicalComparison": "Similar past DeFi events or 'No clear precedent'",
      "correlations": ["List specific metric correlations observed"],
      "timeframe": "Expected duration or resolution timeframe",
      "riskLevel": "Protocol risk assessment"
    }
  ],
  "overallAssessment": "1-2 sentence summary of current protocol health",
  "monitoringPriority": "What to watch most closely in next cycles",
  "falseAlarmProbability": 0.2
}`;

    return prompt;
}

/**
 * Call Claude API with retry logic
 * @param {string} prompt - Formatted prompt
 * @param {number} attempt - Current attempt number
 * @returns {Promise<object>} Claude's response
 */
async function callClaudeAPI(prompt, attempt = 1) {
    try {
        logger.debug('Calling Claude API', { attempt, model: CONFIG.model });

        const response = await anthropic.messages.create({
            model: CONFIG.model,
            max_tokens: CONFIG.maxTokens,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        // Extract text content
        const textContent = response.content.find(c => c.type === 'text');
        if (!textContent) {
            throw new Error('No text content in Claude response');
        }

        logger.info('Claude API call successful', {
            model: response.model,
            usage: response.usage,
            stopReason: response.stop_reason
        });

        return textContent.text;

    } catch (error) {
        logger.error('Claude API call failed', {
            attempt,
            error: error.message,
            type: error.type
        });

        // Check if we should retry
        if (attempt < CONFIG.maxRetries) {
            const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            logger.info(`Retrying in ${delay}ms`, { attempt: attempt + 1 });

            await new Promise(resolve => setTimeout(resolve, delay));
            return callClaudeAPI(prompt, attempt + 1);
        }

        throw error;
    }
}

/**
 * Parse and validate Claude's JSON response
 * @param {string} responseText - Raw response from Claude
 * @returns {object} Parsed and validated analysis
 */
function parseClaudeResponse(responseText) {
    try {
        // Remove markdown code blocks if present
        let cleanedText = responseText.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '');
        }

        // Parse JSON
        const analysis = JSON.parse(cleanedText);

        // Validate structure
        if (!analysis.anomalies || !Array.isArray(analysis.anomalies)) {
            throw new Error('Invalid response structure: missing anomalies array');
        }

        // Validate each anomaly
        analysis.anomalies.forEach((anomaly, index) => {
            const required = ['type', 'severity', 'confidence', 'title', 'description'];
            required.forEach(field => {
                if (!anomaly[field]) {
                    throw new Error(`Anomaly ${index} missing required field: ${field}`);
                }
            });

            // Validate severity
            const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            if (!validSeverities.includes(anomaly.severity)) {
                logger.warn(`Invalid severity: ${anomaly.severity}, defaulting to MEDIUM`);
                anomaly.severity = 'MEDIUM';
            }

            // Validate confidence
            if (typeof anomaly.confidence !== 'number' || anomaly.confidence < 0 || anomaly.confidence > 1) {
                logger.warn(`Invalid confidence: ${anomaly.confidence}, defaulting to 0.5`);
                anomaly.confidence = 0.5;
            }
        });

        logger.info('Claude response parsed successfully', {
            anomalyCount: analysis.anomalies.length
        });

        return analysis;

    } catch (error) {
        logger.error('Failed to parse Claude response', {
            error: error.message,
            responseText: responseText.substring(0, 200)
        });
        throw new Error(`JSON parsing failed: ${error.message}`);
    }
}

/**
 * Store analysis results in database
 * @param {object} analysis - Parsed Claude analysis
 * @param {object} triggerData - Original trigger data
 * @param {object} metadata - Additional metadata
 * @returns {Promise<Array>} Inserted anomaly records
 */
async function storeAnalysisResults(analysis, triggerData, metadata = {}) {
    try {
        const insertedAnomalies = [];

        for (const anomaly of analysis.anomalies) {
            const anomalyData = {
                detected_at: metadata.detectedAt || new Date(),
                anomaly_type: anomaly.type,
                severity: anomaly.severity,
                confidence: anomaly.confidence,
                title: anomaly.title.substring(0, 200), // Ensure max length
                description: anomaly.description,
                affected_metrics: anomaly.affectedMetrics || [],
                recommendation: anomaly.recommendation || null,
                historical_comparison: anomaly.historicalComparison || null,
                claude_analysis: {
                    fullAnalysis: analysis,
                    correlations: anomaly.correlations || [],
                    timeframe: anomaly.timeframe || null,
                    riskLevel: anomaly.riskLevel || null,
                    overallAssessment: analysis.overallAssessment,
                    monitoringPriority: analysis.monitoringPriority,
                    falseAlarmProbability: analysis.falseAlarmProbability
                },
                raw_data: {
                    triggers: triggerData.triggers,
                    maxSeverity: triggerData.maxSeverity,
                    summary: triggerData.summary
                },
                status: 'active'
            };

            const inserted = await queries.insertAnomaly(anomalyData);
            insertedAnomalies.push(inserted);

            logger.info('Anomaly stored in database', {
                id: inserted.id,
                type: inserted.anomaly_type,
                severity: inserted.severity
            });
        }

        return insertedAnomalies;

    } catch (error) {
        logger.error('Failed to store analysis results', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Main function: Analyze anomalies with Claude
 * @param {object} triggerData - Pre-filter trigger results
 * @param {Array} recentData - Recent time-series data
 * @param {object} baselineStats - Baseline statistics
 * @returns {Promise<object>} Analysis results with database IDs
 */
async function analyzeWithClaude(triggerData, recentData, baselineStats) {
    try {
        logger.info('Starting Claude analysis', {
            triggerCount: triggerData.triggers.length,
            maxSeverity: triggerData.maxSeverity
        });

        // 1. Construct prompt
        const prompt = constructPrompt(triggerData, recentData, baselineStats);

        // 2. Call Claude API
        const responseText = await callClaudeAPI(prompt);

        // 3. Parse response
        const analysis = parseClaudeResponse(responseText);

        // 4. Store in database
        const storedAnomalies = await storeAnalysisResults(analysis, triggerData, {
            detectedAt: triggerData.timestamp
        });

        logger.info('Claude analysis completed successfully', {
            anomaliesDetected: storedAnomalies.length,
            overallAssessment: analysis.overallAssessment
        });

        return {
            success: true,
            analysis,
            anomalies: storedAnomalies,
            timestamp: new Date()
        };

    } catch (error) {
        logger.error('Claude analysis failed', {
            error: error.message,
            stack: error.stack
        });

        // Return error result without throwing
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
}

/**
 * Get Claude API configuration (for testing/debugging)
 * @returns {object} Current configuration
 */
function getConfig() {
    return {
        ...CONFIG,
        hasApiKey: !!process.env.ANTHROPIC_API_KEY
    };
}

module.exports = {
    analyzeWithClaude,
    constructPrompt,
    parseClaudeResponse,
    getConfig
};
