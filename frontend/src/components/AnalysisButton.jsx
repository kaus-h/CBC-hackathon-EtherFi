/**
 * Manual Claude Analysis Button Component
 * Allows users to generate on-demand AI-powered anomaly analysis reports
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function AnalysisButton() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const generateAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Analysis] Requesting AI analysis...');
      const response = await api.post('/analysis/generate');
      console.log('[Analysis] Response received:', response.data);
      setReport(response.data);
      setShowModal(true);
      console.log('[Analysis] Modal should now be visible');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate analysis report';
      setError(errorMsg);
      console.error('[Analysis] Generation failed:', err);
      console.error('[Analysis] Error details:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'text-terminal-critical';
      case 'HIGH': return 'text-terminal-warning';
      case 'MEDIUM': return 'text-terminal-accent';
      case 'LOW': return 'text-terminal-success';
      default: return 'text-terminal-text';
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      'CRITICAL': 'bg-terminal-critical/20 text-terminal-critical border-terminal-critical',
      'HIGH': 'bg-terminal-warning/20 text-terminal-warning border-terminal-warning',
      'MEDIUM': 'bg-terminal-accent/20 text-terminal-accent border-terminal-accent',
      'LOW': 'bg-terminal-success/20 text-terminal-success border-terminal-success'
    };
    return colors[severity?.toUpperCase()] || colors['LOW'];
  };

  return (
    <>
      {/* Generate Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="terminal-card chrome-effect p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-terminal-text mb-1">
                AI-POWERED ANALYSIS
              </h3>
              <p className="text-xs text-terminal-muted font-mono">
                Generate comprehensive anomaly report using Claude AI
              </p>
            </div>

            <button
              onClick={generateAnalysis}
              disabled={loading}
              className={`btn-terminal ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
                  <span>ANALYZING...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>🤖</span>
                  <span>GENERATE REPORT</span>
                </div>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-terminal-critical/10 border border-terminal-critical/30 rounded"
            >
              <div className="text-xs text-terminal-critical font-mono">
                ✗ {error}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Analysis Report Modal - Rendered via Portal */}
      {showModal && report && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="terminal-card chrome-effect max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-terminal-bg/95 backdrop-blur-sm border-b border-terminal-border p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold text-terminal-accent">
                    🤖 CLAUDE AI ANALYSIS REPORT
                  </h2>
                  <p className="text-xs text-terminal-muted font-mono mt-1">
                    Generated: {new Date(report.generated_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-terminal-muted hover:text-terminal-text transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Current State */}
                <section>
                  <h3 className="text-lg font-display font-bold text-terminal-text mb-3 flex items-center">
                    <span className="mr-2">📊</span>
                    CURRENT STATE
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">TVL (ETH)</div>
                      <div className="text-lg font-bold text-terminal-accent font-mono">
                        {report.current_state.tvl_eth.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">TVL (USD)</div>
                      <div className="text-lg font-bold text-terminal-accent font-mono">
                        ${report.current_state.tvl_usd.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">eETH/ETH Ratio</div>
                      <div className="text-lg font-bold text-terminal-accent font-mono">
                        {report.current_state.eeth_eth_ratio.toFixed(6)}
                      </div>
                    </div>
                    <div className="p-3 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">Gas Price</div>
                      <div className="text-lg font-bold text-terminal-accent font-mono">
                        {report.current_state.avg_gas_price_gwei.toFixed(4)} GWEI
                      </div>
                    </div>
                    <div className="p-3 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">Stakers</div>
                      <div className="text-lg font-bold text-terminal-accent font-mono">
                        {report.current_state.unique_stakers.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">Validators</div>
                      <div className="text-lg font-bold text-terminal-accent font-mono">
                        {report.current_state.total_validators.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Baseline Comparison */}
                <section>
                  <h3 className="text-lg font-display font-bold text-terminal-text mb-3 flex items-center">
                    <span className="mr-2">📈</span>
                    DEVIATION FROM BASELINE ({report.baseline_comparison.baseline_period_days} DAYS)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">TVL Deviation</div>
                      <div className={`text-2xl font-bold font-mono ${parseFloat(report.baseline_comparison.tvl_deviation_pct) > 0 ? 'text-terminal-success' : 'text-terminal-critical'}`}>
                        {parseFloat(report.baseline_comparison.tvl_deviation_pct) >= 0 ? '+' : ''}{report.baseline_comparison.tvl_deviation_pct}%
                      </div>
                    </div>
                    <div className="p-4 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">Peg Deviation</div>
                      <div className={`text-2xl font-bold font-mono ${parseFloat(report.baseline_comparison.peg_deviation_pct) < 0.3 ? 'text-terminal-success' : 'text-terminal-warning'}`}>
                        {report.baseline_comparison.peg_deviation_pct}%
                      </div>
                    </div>
                    <div className="p-4 bg-terminal-bg-light rounded border border-terminal-border">
                      <div className="text-xs text-terminal-muted font-mono mb-1">Gas Deviation</div>
                      <div className={`text-2xl font-bold font-mono ${Math.abs(parseFloat(report.baseline_comparison.gas_deviation_pct)) < 20 ? 'text-terminal-success' : 'text-terminal-warning'}`}>
                        {parseFloat(report.baseline_comparison.gas_deviation_pct) >= 0 ? '+' : ''}{report.baseline_comparison.gas_deviation_pct}%
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-terminal-muted font-mono mt-2">
                    Based on {report.baseline_comparison.baseline_data_points} data points
                  </div>
                </section>

                {/* Claude Analysis */}
                {report.analysis && (
                  <section>
                    <h3 className="text-lg font-display font-bold text-terminal-text mb-3 flex items-center">
                      <span className="mr-2">🤖</span>
                      AI ANALYSIS
                    </h3>

                    {/* Overall Assessment */}
                    {report.analysis.overallAssessment && (
                      <div className="mb-4 p-4 bg-terminal-accent/10 border border-terminal-accent/30 rounded">
                        <div className="text-sm font-mono text-terminal-text leading-relaxed">
                          {report.analysis.overallAssessment}
                        </div>
                      </div>
                    )}

                    {/* Key Findings */}
                    {report.analysis.keyFindings && report.analysis.keyFindings.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-terminal-accent mb-2 font-mono">KEY FINDINGS:</h4>
                        <ul className="space-y-2">
                          {report.analysis.keyFindings.map((finding, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-terminal-accent mt-1">▸</span>
                              <span className="text-sm text-terminal-text font-mono flex-1">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    {report.analysis.riskLevel && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-terminal-accent mb-2 font-mono">RISK LEVEL:</h4>
                        <div className={`inline-block px-3 py-1 rounded border ${getSeverityBadge(report.analysis.riskLevel)} font-mono text-sm font-bold`}>
                          {report.analysis.riskLevel}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {report.analysis.recommendations && report.analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-terminal-accent mb-2 font-mono">RECOMMENDATIONS:</h4>
                        <ul className="space-y-2">
                          {report.analysis.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-terminal-success mt-1">✓</span>
                              <span className="text-sm text-terminal-text font-mono flex-1">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                {/* Detected Anomalies */}
                {report.anomalies && report.anomalies.length > 0 && (
                  <section>
                    <h3 className="text-lg font-display font-bold text-terminal-text mb-3 flex items-center">
                      <span className="mr-2">⚠️</span>
                      DETECTED ANOMALIES ({report.anomalies.length})
                    </h3>
                    <div className="space-y-3">
                      {report.anomalies.map((anomaly, idx) => (
                        <div key={idx} className="p-4 bg-terminal-bg-light rounded border border-terminal-border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm font-bold font-mono ${getSeverityColor(anomaly.severity)}`}>
                                {anomaly.severity}
                              </span>
                              <span className="text-xs text-terminal-muted font-mono">
                                {new Date(anomaly.detected_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-terminal-text font-mono mb-2">
                            {anomaly.description}
                          </p>
                          {anomaly.recommendation && (
                            <div className="text-xs text-terminal-muted font-mono mt-2 pl-3 border-l-2 border-terminal-accent/30">
                              💡 {anomaly.recommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-terminal-bg/95 backdrop-blur-sm border-t border-terminal-border p-4 flex justify-end">
                <button onClick={closeModal} className="btn-terminal">
                  CLOSE
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
