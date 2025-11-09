import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

function Charts({ historicalData = [] }) {
  const [selectedMetric, setSelectedMetric] = useState('tvl_eth');
  const [timeRange, setTimeRange] = useState('24h');

  const metrics = [
    {
      key: 'tvl_eth',
      label: 'Total Value Locked',
      color: '#00ffff',
      unit: 'ETH',
      format: (val) => `${(val / 1_000_000).toFixed(2)}M`
    },
    {
      key: 'eeth_eth_ratio',
      label: 'eETH/ETH Peg Ratio',
      color: '#00ff88',
      unit: '',
      format: (val) => val?.toFixed(6) || '0'
    },
    {
      key: 'avg_gas_price_gwei',
      label: 'Gas Price',
      color: '#ffaa00',
      unit: 'GWEI',
      format: (val) => val?.toFixed(4) || '0'  // ✅ 4 decimals: 0.0792 not 0.08
    },
    {
      key: 'unique_stakers',
      label: 'Unique Stakers',
      color: '#00ffff',
      unit: '',
      format: (val) => (val / 1000).toFixed(1) + 'K'
    }
  ];

  const timeRanges = [
    { value: '1h', label: '1H', hours: 1 },
    { value: '6h', label: '6H', hours: 6 },
    { value: '24h', label: '24H', hours: 24 },
    { value: '7d', label: '7D', hours: 168 },
    { value: '30d', label: '30D', hours: 720 }
  ];

  const currentMetric = metrics.find(m => m.key === selectedMetric);

  // Filter data by time range
  const filterDataByRange = (data, hours) => {
    if (!data || data.length === 0) return [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return data.filter(d => new Date(d.timestamp) >= cutoff);
  };

  const filteredData = filterDataByRange(
    historicalData,
    timeRanges.find(r => r.value === timeRange)?.hours || 24
  );

  // Format data for charts and ensure chronological order (left to right)
  const chartData = filteredData
    .map(d => ({
      ...d,
      timestamp: new Date(d.timestamp).getTime(),
      formattedTime: formatTime(d.timestamp, timeRange)
    }))
    .sort((a, b) => a.timestamp - b.timestamp); // Ascending order: oldest to newest

  function formatTime(timestamp, range) {
    const date = new Date(timestamp);
    if (range === '1h' || range === '6h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (range === '24h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const value = data[selectedMetric];

    return (
      <div className="bg-terminal-surface border-2 border-terminal-accent p-3 shadow-glow">
        <div className="text-xs text-terminal-muted mb-1 font-mono">
          {new Date(data.timestamp).toLocaleString()}
        </div>
        <div className="text-sm font-bold text-terminal-accent font-mono">
          {currentMetric.label}
        </div>
        <div className="text-2xl font-bold text-terminal-text font-mono">
          {currentMetric.format(value)} {currentMetric.unit}
        </div>
      </div>
    );
  };

  if (!historicalData || historicalData.length === 0) {
    return (
      <div className="terminal-card chrome-effect">
        <h2 className="text-xl font-display font-bold text-terminal-accent tracking-tight mb-4">
          HISTORICAL METRICS
        </h2>
        <div className="text-center py-12">
          <div className="text-6xl text-terminal-accent/20 mb-4">📊</div>
          <div className="text-lg font-bold text-terminal-muted mb-2">
            NO HISTORICAL DATA
          </div>
          <div className="text-sm text-terminal-muted/70 font-mono">
            Collecting metrics... Check back soon
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-card chrome-effect">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-terminal-accent tracking-tight">
          HISTORICAL METRICS
        </h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-terminal-accent rounded-full animate-pulse-glow" />
          <span className="text-xs text-terminal-muted font-mono">
            {chartData.length} DATA POINTS
          </span>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {metrics.map(metric => (
          <motion.button
            key={metric.key}
            onClick={() => setSelectedMetric(metric.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-3 py-2 text-xs font-mono font-bold tracking-wider
              border transition-all
              ${selectedMetric === metric.key
                ? 'bg-terminal-accent text-terminal-bg border-terminal-accent'
                : 'bg-transparent text-terminal-accent border-terminal-accent/30 hover:border-terminal-accent'
              }
            `}
          >
            {metric.label}
          </motion.button>
        ))}
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-terminal-border/30">
        {timeRanges.map(range => (
          <motion.button
            key={range.value}
            onClick={() => setTimeRange(range.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-3 py-1 text-xs font-mono font-bold tracking-wider
              border transition-all
              ${timeRange === range.value
                ? 'bg-terminal-accent/20 text-terminal-accent border-terminal-accent'
                : 'bg-transparent text-terminal-muted border-terminal-border hover:border-terminal-accent/50'
              }
            `}
          >
            {range.label}
          </motion.button>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-[400px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0, 255, 255, 0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="formattedTime"
                stroke="#00ffff"
                style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                tick={{ fill: '#4a5568' }}
              />
              <YAxis
                stroke="#00ffff"
                style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                tick={{ fill: '#4a5568' }}
                tickFormatter={(value) => currentMetric.format(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={currentMetric.color}
                strokeWidth={2}
                fill="url(#colorMetric)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-terminal-muted/50 mb-2">No data for selected range</div>
            <div className="text-xs text-terminal-muted/30 font-mono">
              Try selecting a different time range
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-terminal-border/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const values = chartData.map(d => d[selectedMetric]).filter(v => v != null);
              const current = values[values.length - 1];
              const min = Math.min(...values);
              const max = Math.max(...values);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;

              return (
                <>
                  <div>
                    <div className="text-xs text-terminal-muted uppercase tracking-wide mb-1">
                      Current
                    </div>
                    <div className="text-lg font-bold text-terminal-accent font-mono">
                      {currentMetric.format(current)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-terminal-muted uppercase tracking-wide mb-1">
                      Average
                    </div>
                    <div className="text-lg font-bold text-terminal-text font-mono">
                      {currentMetric.format(avg)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-terminal-muted uppercase tracking-wide mb-1">
                      Min
                    </div>
                    <div className="text-lg font-bold text-terminal-success font-mono">
                      {currentMetric.format(min)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-terminal-muted uppercase tracking-wide mb-1">
                      Max
                    </div>
                    <div className="text-lg font-bold text-terminal-warning font-mono">
                      {currentMetric.format(max)}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default Charts;
