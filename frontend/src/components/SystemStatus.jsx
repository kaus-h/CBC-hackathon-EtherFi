import React from 'react';
import { motion } from 'framer-motion';

function SystemStatus({ systemHealth }) {
  if (!systemHealth) {
    return null;
  }

  const { collectors = [], lastUpdate } = systemHealth;

  // Determine overall system health
  const allHealthy = collectors.every(c => c.status === 'healthy');
  const hasErrors = collectors.some(c => c.status === 'error');
  const hasWarnings = collectors.some(c => c.status === 'warning');

  let overallStatus = 'healthy';
  let statusColor = 'terminal-success';
  let statusIcon = '✓';
  let statusText = 'ALL SYSTEMS OPERATIONAL';

  if (hasErrors) {
    overallStatus = 'error';
    statusColor = 'terminal-critical';
    statusIcon = '✗';
    statusText = 'SYSTEM ERRORS DETECTED';
  } else if (hasWarnings) {
    overallStatus = 'warning';
    statusColor = 'terminal-warning';
    statusIcon = '⚠';
    statusText = 'SYSTEM WARNINGS';
  }

  const statusConfig = {
    healthy: {
      color: 'terminal-success',
      bg: 'bg-terminal-success/20',
      border: 'border-terminal-success',
      icon: '●'
    },
    warning: {
      color: 'terminal-warning',
      bg: 'bg-terminal-warning/20',
      border: 'border-terminal-warning',
      icon: '▲'
    },
    error: {
      color: 'terminal-critical',
      bg: 'bg-terminal-critical/20',
      border: 'border-terminal-critical',
      icon: '✗'
    },
    idle: {
      color: 'terminal-muted',
      bg: 'bg-terminal-muted/20',
      border: 'border-terminal-muted',
      icon: '○'
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLastRun = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const lastRun = new Date(timestamp);
    const diffMs = now - lastRun;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return lastRun.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-l-4 border-${statusColor} bg-terminal-surface/90 backdrop-blur-sm mb-6`}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Overall Status */}
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-12 h-12 ${statusConfig[overallStatus].bg} border-2 ${statusConfig[overallStatus].border} flex items-center justify-center`}
            >
              <span className={`text-2xl text-${statusColor}`}>{statusIcon}</span>
            </motion.div>

            <div>
              <div className={`text-lg font-bold text-${statusColor} tracking-wider font-display`}>
                {statusText}
              </div>
              <div className="text-xs text-terminal-muted font-mono">
                {lastUpdate && `Last updated: ${formatLastRun(lastUpdate)}`}
              </div>
            </div>
          </div>

          {/* Collector Count */}
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-terminal-accent font-mono">
                {collectors.filter(c => c.status === 'healthy').length}/{collectors.length}
              </div>
              <div className="text-xs text-terminal-muted uppercase tracking-wide">
                Active Collectors
              </div>
            </div>
          </div>
        </div>

        {/* Collector Details */}
        {collectors.length > 0 && (
          <div className="mt-4 pt-4 border-t border-terminal-border/30">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {collectors.map((collector, idx) => {
                const config = statusConfig[collector.status] || statusConfig.idle;

                return (
                  <motion.div
                    key={collector.name || idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`${config.bg} border ${config.border} p-3 hover:scale-[1.02] transition-transform`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-${config.color}`}>{config.icon}</span>
                        <span className="text-sm font-bold text-terminal-text font-mono uppercase">
                          {collector.name}
                        </span>
                      </div>
                      {collector.status === 'healthy' && (
                        <motion.div
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-2 h-2 rounded-full bg-${config.color}`}
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-terminal-muted">Last Run:</span>
                        <span className="text-terminal-text font-mono">
                          {formatLastRun(collector.lastRun)}
                        </span>
                      </div>

                      {collector.uptime && (
                        <div className="flex justify-between text-xs">
                          <span className="text-terminal-muted">Uptime:</span>
                          <span className="text-terminal-text font-mono">
                            {formatUptime(collector.uptime)}
                          </span>
                        </div>
                      )}

                      {collector.successRate !== undefined && (
                        <div className="flex justify-between text-xs">
                          <span className="text-terminal-muted">Success:</span>
                          <span className={`font-mono font-bold ${
                            collector.successRate > 95 ? 'text-terminal-success' :
                            collector.successRate > 80 ? 'text-terminal-warning' :
                            'text-terminal-critical'
                          }`}>
                            {collector.successRate.toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {collector.errorMessage && (
                        <div className="mt-2 pt-2 border-t border-terminal-border/30">
                          <div className="text-xs text-terminal-critical font-mono">
                            {collector.errorMessage}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default SystemStatus;
