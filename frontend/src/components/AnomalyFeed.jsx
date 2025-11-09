import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnomalyCard from './AnomalyCard';

function AnomalyFeed({ anomalies = [] }) {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [isExpanded, setIsExpanded] = useState(true);

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  // Filter and sort anomalies
  const filteredAnomalies = anomalies
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .sort((a, b) => {
      // Sort by severity first, then by timestamp
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.detected_at) - new Date(a.detected_at);
    });

  const severityCounts = anomalies.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  const filterButtons = [
    { value: 'all', label: 'ALL', color: 'terminal-accent' },
    { value: 'CRITICAL', label: 'CRITICAL', color: 'terminal-critical' },
    { value: 'HIGH', label: 'HIGH', color: 'terminal-warning' },
    { value: 'MEDIUM', label: 'MEDIUM', color: 'terminal-accent' },
    { value: 'LOW', label: 'LOW', color: 'terminal-success' }
  ];

  if (anomalies.length === 0) {
    return (
      <div className="terminal-card chrome-effect">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-terminal-accent tracking-tight">
            ANOMALY FEED
          </h2>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl text-terminal-accent/20 mb-4">✓</div>
          <div className="text-lg font-bold text-terminal-muted mb-2">
            NO ANOMALIES DETECTED
          </div>
          <div className="text-sm text-terminal-muted/70 font-mono">
            All systems operating within normal parameters
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card chrome-effect">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-display font-bold text-terminal-accent tracking-tight">
            ANOMALY FEED
          </h2>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-terminal-critical"
          />
          <span className="text-sm text-terminal-muted font-mono">
            {filteredAnomalies.length} {filteredAnomalies.length === 1 ? 'ALERT' : 'ALERTS'}
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-terminal-accent hover:text-terminal-accent/70 transition-colors"
        >
          <span className="text-lg font-mono">
            {isExpanded ? '[-]' : '[+]'}
          </span>
        </button>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-terminal-border/30">
        {filterButtons.map(btn => {
          const count = btn.value === 'all'
            ? anomalies.length
            : (severityCounts[btn.value] || 0);
          const isActive = filterSeverity === btn.value;

          return (
            <motion.button
              key={btn.value}
              onClick={() => setFilterSeverity(btn.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                px-3 py-1.5 text-xs font-mono font-bold tracking-wider
                border-2 transition-all
                ${isActive
                  ? `bg-${btn.color} text-terminal-bg border-${btn.color}`
                  : `bg-transparent text-${btn.color} border-${btn.color}/30 hover:border-${btn.color}`
                }
              `}
            >
              {btn.label}
              {count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  isActive ? 'bg-terminal-bg/30' : `bg-${btn.color}/20`
                }`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Anomaly List */}
      <AnimatePresence mode="popLayout">
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 max-h-[600px] overflow-y-auto pr-2"
          >
            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-terminal-muted mb-2">
                  No {filterSeverity.toLowerCase()} anomalies found
                </div>
              </div>
            ) : (
              filteredAnomalies.map((anomaly, index) => (
                <AnomalyCard
                  key={anomaly.id || index}
                  anomaly={anomaly}
                  index={index}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Footer */}
      {isExpanded && filteredAnomalies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-terminal-border/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-critical">
                {severityCounts.CRITICAL || 0}
              </div>
              <div className="text-xs text-terminal-muted uppercase tracking-wide">
                Critical
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-warning">
                {severityCounts.HIGH || 0}
              </div>
              <div className="text-xs text-terminal-muted uppercase tracking-wide">
                High
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-accent">
                {severityCounts.MEDIUM || 0}
              </div>
              <div className="text-xs text-terminal-muted uppercase tracking-wide">
                Medium
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-terminal-success">
                {severityCounts.LOW || 0}
              </div>
              <div className="text-xs text-terminal-muted uppercase tracking-wide">
                Low
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnomalyFeed;
