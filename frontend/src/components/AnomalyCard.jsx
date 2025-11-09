import React from 'react';
import { motion } from 'framer-motion';

function AnomalyCard({ anomaly, index }) {
  const severityConfig = {
    CRITICAL: {
      class: 'anomaly-critical',
      icon: '⚠',
      borderColor: 'border-terminal-critical',
      textColor: 'text-terminal-critical',
      bgGlow: 'bg-terminal-critical/10'
    },
    HIGH: {
      class: 'anomaly-high',
      icon: '⚡',
      borderColor: 'border-terminal-warning',
      textColor: 'text-terminal-warning',
      bgGlow: 'bg-terminal-warning/10'
    },
    MEDIUM: {
      class: 'anomaly-medium',
      icon: '●',
      borderColor: 'border-terminal-accent',
      textColor: 'text-terminal-accent',
      bgGlow: 'bg-terminal-accent/10'
    },
    LOW: {
      class: 'anomaly-low',
      icon: '◆',
      borderColor: 'border-terminal-success',
      textColor: 'text-terminal-success',
      bgGlow: 'bg-terminal-success/10'
    }
  };

  const config = severityConfig[anomaly.severity] || severityConfig.MEDIUM;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className={`anomaly-alert ${config.class} relative group hover:scale-[1.01]`}
    >
      {/* Severity Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${config.bgGlow} border ${config.borderColor} flex items-center justify-center`}>
            <span className={`text-2xl ${config.textColor}`}>{config.icon}</span>
          </div>
          <div>
            <div className={`text-sm font-bold ${config.textColor} tracking-wider`}>
              {anomaly.severity} SEVERITY
            </div>
            <div className="text-xs text-terminal-muted font-mono">
              {formatTimestamp(anomaly.detected_at)}
            </div>
          </div>
        </div>

        {/* Confidence Badge */}
        {anomaly.confidence && (
          <div className={`px-2 py-1 border ${config.borderColor} ${config.bgGlow}`}>
            <div className="text-xs font-mono font-bold text-terminal-text">
              {Math.round(anomaly.confidence * 100)}%
            </div>
            <div className="text-[10px] text-terminal-muted">CONF</div>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-terminal-text mb-2 font-display">
        {anomaly.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-terminal-muted mb-3 leading-relaxed">
        {anomaly.description}
      </p>

      {/* Metrics Grid */}
      {anomaly.affected_metrics && anomaly.affected_metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-terminal-border/30">
          {anomaly.affected_metrics.map((metric, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-xs text-terminal-muted uppercase tracking-wide">
                {metric.name?.replace(/_/g, ' ')}
              </span>
              <span className={`text-sm font-mono font-bold ${config.textColor}`}>
                {typeof metric.value === 'number'
                  ? metric.value.toFixed(4)
                  : metric.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommended Actions */}
      {anomaly.recommended_actions && anomaly.recommended_actions.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold text-terminal-accent mb-2 tracking-wider">
            → RECOMMENDED ACTIONS
          </div>
          <ul className="space-y-1">
            {anomaly.recommended_actions.map((action, idx) => (
              <li key={idx} className="text-xs text-terminal-muted flex items-start">
                <span className={`mr-2 ${config.textColor}`}>▸</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical Details Toggle */}
      {anomaly.technical_details && (
        <details className="mt-3 group/details">
          <summary className="text-xs text-terminal-accent cursor-pointer hover:text-terminal-accent/80 font-mono tracking-wide">
            [+] TECHNICAL DETAILS
          </summary>
          <pre className="mt-2 text-xs text-terminal-muted bg-terminal-bg/50 p-2 border border-terminal-border/30 overflow-x-auto font-mono">
            {JSON.stringify(anomaly.technical_details, null, 2)}
          </pre>
        </details>
      )}

      {/* Animated Corner Accent */}
      <div className={`absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 ${config.borderColor}/30 transition-all duration-300 group-hover:w-20 group-hover:h-20`}></div>
    </motion.div>
  );
}

export default AnomalyCard;
