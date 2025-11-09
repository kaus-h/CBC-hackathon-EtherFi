import React from 'react';
import { motion } from 'framer-motion';

function MetricsPanel({ metrics }) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="terminal-card animate-pulse">
            <div className="h-24 bg-terminal-border/30 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const pegDeviation = Math.abs(metrics.eeth_eth_ratio - 1.0) * 100;
  const pegStatus = pegDeviation < 0.3 ? 'HEALTHY' : pegDeviation < 0.5 ? 'WARNING' : 'CRITICAL';
  const pegColor = pegDeviation < 0.3 ? 'terminal-success' : pegDeviation < 0.5 ? 'terminal-warning' : 'terminal-critical';

  const metricCards = [
    {
      label: 'TOTAL VALUE LOCKED',
      value: `${(metrics.tvl_eth / 1_000_000).toFixed(2)}M`,
      unit: 'ETH',
      subValue: `$${(metrics.tvl_usd / 1_000_000_000).toFixed(2)}B USD`,
      icon: '◈',
      color: 'terminal-accent',
      glow: true
    },
    {
      label: 'EETH/ETH PEG HEALTH',
      value: metrics.eeth_eth_ratio.toFixed(6),
      unit: pegStatus,
      subValue: `${pegDeviation.toFixed(3)}% deviation`,
      icon: '⚖',
      color: pegColor,
      glow: pegDeviation >= 0.5
    },
    {
      label: 'NETWORK GAS PRICE',
      value: metrics.avg_gas_price_gwei.toFixed(4),  // ✅ 4 decimals: 0.0792 not 0.08
      unit: 'GWEI',
      subValue: `$${metrics.avg_tx_cost_usd?.toFixed(2) || '0.00'} per TX`,
      icon: '⛽',
      color: metrics.avg_gas_price_gwei > 20 ? 'terminal-warning' : 'terminal-success',
      glow: metrics.avg_gas_price_gwei > 50
    },
    {
      label: 'UNIQUE STAKERS',
      value: (metrics.unique_stakers / 1000).toFixed(1),
      unit: 'K',
      subValue: `${metrics.total_validators?.toLocaleString() || '0'} validators`,
      icon: '▣',
      color: 'terminal-accent',
      glow: false
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className={`terminal-card chrome-effect ${card.glow ? 'shadow-glow' : ''}`}
        >
          {/* Label */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs font-bold text-terminal-muted tracking-wider mb-1">
                {card.label}
              </div>
              <div className="text-xs text-terminal-muted/50 font-mono">
                LIVE DATA
              </div>
            </div>
            <span className={`text-3xl text-${card.color}`}>{card.icon}</span>
          </div>

          {/* Value */}
          <div className="mb-2">
            <div className="flex items-baseline space-x-2">
              <span className={`metric-value text-${card.color}`}>
                {card.value}
              </span>
              <span className={`text-sm font-bold text-${card.color}/70 tracking-wider`}>
                {card.unit}
              </span>
            </div>
          </div>

          {/* Sub Value */}
          <div className="text-xs text-terminal-muted font-mono border-t border-terminal-border/50 pt-2">
            {card.subValue}
          </div>

          {/* Animated Corner Accent */}
          <div className={`absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-${card.color}/30`}></div>
        </motion.div>
      ))}
    </div>
  );
}

export default MetricsPanel;
