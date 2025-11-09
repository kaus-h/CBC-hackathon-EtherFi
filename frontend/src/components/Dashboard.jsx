import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import MetricsPanel from './MetricsPanel';
import AnomalyFeed from './AnomalyFeed';
import Charts from './Charts';
import SystemStatus from './SystemStatus';
import AnalysisButton from './AnalysisButton';
import api from '../services/api';
import websocketService from '../services/websocket';

function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [metricsRes, anomaliesRes, historicalRes, systemRes] = await Promise.all([
        api.get('/metrics/current'),
        api.get('/anomalies?limit=20'),
        api.get('/metrics/historical?days=30&metric=all'),
        api.get('/system/status')
      ]);

      setMetrics(metricsRes.data);
      setAnomalies(anomaliesRes.data.anomalies || []);
      setHistoricalData(historicalRes.data.data || []);
      setSystemHealth(systemRes.data);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err.message || 'Failed to load data');
      setLoading(false);
    }
  }, []);

  // Set up WebSocket listeners
  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();

    // Listen for connection events
    const handleConnect = () => {
      console.log('WebSocket connected');
      setConnected(true);
      fetchInitialData();
    };

    const handleDisconnect = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };

    const handleError = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
    };

    // Listen for data updates
    const handleMetricsUpdate = (payload) => {
      console.log('Metrics update received:', payload);
      // WebSocket sends { type: 'metrics_update', data: {...} }
      // We need just the data object
      const data = payload.data || payload;
      setMetrics(data);
    };

    const handleAnomalyDetected = (payload) => {
      console.log('Anomaly detected:', payload);
      // WebSocket sends { type: 'anomaly_detected', severity: ..., anomaly: {...} }
      // We need just the anomaly object
      const anomaly = payload.anomaly || payload;
      setAnomalies(prev => [anomaly, ...prev].slice(0, 50)); // Keep last 50
    };

    const handleSystemUpdate = (data) => {
      console.log('System update received:', data);
      setSystemHealth(data);
    };

    // Register listeners
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('error', handleError);
    websocketService.on('metrics:update', handleMetricsUpdate);
    websocketService.on('anomaly:detected', handleAnomalyDetected);
    websocketService.on('system:status', handleSystemUpdate);

    // Initial data fetch
    fetchInitialData();

    // Cleanup
    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('error', handleError);
      websocketService.off('metrics:update', handleMetricsUpdate);
      websocketService.off('anomaly:detected', handleAnomalyDetected);
      websocketService.off('system:status', handleSystemUpdate);
      websocketService.disconnect();
    };
  }, [fetchInitialData]);

  // Refresh historical data periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/metrics/historical?days=30&metric=all');
        setHistoricalData(res.data.data || []);
      } catch (err) {
        console.error('Error refreshing historical data:', err);
      }
    }, 2 * 60 * 1000); // Every 2 minutes (faster refresh while historical data loads)

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-terminal-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-xl font-bold text-terminal-accent mb-2 font-display">
            INITIALIZING SYSTEM
          </div>
          <div className="text-sm text-terminal-muted font-mono">
            Loading protocol data...
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error && !metrics) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="terminal-card chrome-effect max-w-md"
        >
          <div className="text-center">
            <div className="text-6xl text-terminal-critical mb-4">✗</div>
            <div className="text-xl font-bold text-terminal-critical mb-2 font-display">
              CONNECTION FAILED
            </div>
            <div className="text-sm text-terminal-muted mb-4 font-mono">
              {error}
            </div>
            <button
              onClick={fetchInitialData}
              className="btn-terminal"
            >
              RETRY CONNECTION
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg">
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Header */}
      <Header connected={connected} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* System Status Banner */}
        <AnimatePresence>
          {systemHealth && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SystemStatus systemHealth={systemHealth} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Metrics Panel */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-bold text-terminal-text tracking-tight">
              LIVE METRICS
            </h2>
            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-terminal-success rounded-full"
              />
              <span className="text-xs text-terminal-muted font-mono">
                REAL-TIME
              </span>
            </div>
          </div>
          <MetricsPanel metrics={metrics} />
        </motion.section>

        {/* Manual Analysis Button */}
        <AnalysisButton />

        {/* Charts and Anomalies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Historical Charts - 2/3 width */}
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Charts historicalData={historicalData} />
          </motion.section>

          {/* Anomaly Feed - 1/3 width */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <AnomalyFeed anomalies={anomalies} />
          </motion.section>
        </div>

        {/* Footer Info */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-terminal-muted/50 font-mono py-6 border-t border-terminal-border/30"
        >
          <div className="mb-2">
            ETHERFI ANOMALY DETECTION SYSTEM // PHASE 8 COMPLETE
          </div>
          <div>
            POWERED BY CLAUDE SONNET 4.5 // REAL-TIME BLOCKCHAIN MONITORING
          </div>
        </motion.footer>
      </main>
    </div>
  );
}

export default Dashboard;
