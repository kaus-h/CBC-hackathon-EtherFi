import React from 'react';
import { motion } from 'framer-motion';

function Header({ connected }) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-b border-terminal-accent/30 bg-terminal-surface/80 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <motion.div
            className="flex items-center space-x-4"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 bg-terminal-accent/20 border-2 border-terminal-accent flex items-center justify-center">
              <span className="text-terminal-accent text-2xl font-bold">Ξ</span>
            </div>
            <div>
              <h1 className="text-2xl font-display font-black text-terminal-accent tracking-tight">
                ETHERFI<span className="text-terminal-text/50">//</span>ANOMALY
              </h1>
              <p className="text-xs text-terminal-muted font-mono">REAL-TIME PROTOCOL MONITORING</p>
            </div>
          </motion.div>

          {/* Connection Status */}
          <div className="flex items-center space-x-6">
            {/* WebSocket Status */}
            <div className="flex items-center space-x-2">
              <div className={`status-indicator ${connected ? 'status-online' : 'status-offline'}`} />
              <div className="text-sm">
                <div className="font-mono font-bold text-terminal-text">
                  {connected ? 'ONLINE' : 'OFFLINE'}
                </div>
                <div className="text-xs text-terminal-muted">WebSocket</div>
              </div>
            </div>

            {/* Live Badge */}
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="px-3 py-1 bg-terminal-critical/20 border border-terminal-critical"
            >
              <span className="text-terminal-critical font-bold text-xs tracking-wider">● LIVE</span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

export default Header;
