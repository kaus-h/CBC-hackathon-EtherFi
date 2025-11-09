/**
 * WebSocket Server (Phase 7)
 * Real-time updates using Socket.io
 */

const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;
let connectedClients = 0;

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 */
function initializeWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? false
                : ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        connectedClients++;
        logger.info('WebSocket client connected', {
            socketId: socket.id,
            totalClients: connectedClients
        });

        // Send welcome message
        socket.emit('connection:success', {
            message: 'Connected to EtherFi Anomaly Detection System',
            timestamp: new Date().toISOString(),
            features: ['real-time metrics', 'anomaly alerts', 'system status']
        });

        socket.on('disconnect', () => {
            connectedClients--;
            logger.info('WebSocket client disconnected', {
                socketId: socket.id,
                totalClients: connectedClients
            });
        });

        socket.on('error', (error) => {
            logger.error('WebSocket error', {
                socketId: socket.id,
                error: error.message
            });
        });
    });

    // Heartbeat every 30 seconds
    setInterval(() => {
        if (io) {
            io.emit('heartbeat', {
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                connectedClients
            });
        }
    }, 30000);

    logger.info('WebSocket server initialized');
    return io;
}

/**
 * Broadcast metrics update to all connected clients
 * @param {object} data - Metrics data
 */
function broadcastMetricsUpdate(data) {
    if (!io) {
        logger.warn('WebSocket not initialized, cannot broadcast metrics');
        return;
    }

    io.emit('metrics:update', {
        type: 'metrics_update',
        data: {
            tvl_eth: data.tvl_eth,
            tvl_usd: data.tvl_usd,
            eeth_eth_ratio: data.eeth_eth_ratio,
            avg_gas_price_gwei: data.avg_gas_price_gwei,
            unique_stakers: data.unique_stakers,
            total_validators: data.total_validators,
            timestamp: data.timestamp || new Date().toISOString()
        }
    });

    logger.debug('Broadcasted metrics update', {
        clients: connectedClients
    });
}

/**
 * Broadcast anomaly detection to all connected clients
 * @param {object} anomaly - Anomaly object
 */
function broadcastAnomalyDetected(anomaly) {
    if (!io) {
        logger.warn('WebSocket not initialized, cannot broadcast anomaly');
        return;
    }

    io.emit('anomaly:detected', {
        type: 'anomaly_detected',
        severity: anomaly.severity,
        anomaly: {
            id: anomaly.id,
            detected_at: anomaly.detected_at,
            type: anomaly.anomaly_type,
            severity: anomaly.severity,
            confidence: parseFloat(anomaly.confidence),
            title: anomaly.title,
            description: anomaly.description,
            affected_metrics: anomaly.affected_metrics,
            recommendation: anomaly.recommendation
        }
    });

    logger.info('Broadcasted anomaly alert', {
        severity: anomaly.severity,
        clients: connectedClients
    });
}

/**
 * Broadcast system status update
 * @param {object} status - System status data
 */
function broadcastSystemStatus(status) {
    if (!io) return;

    io.emit('system:status', {
        type: 'system_status',
        ...status,
        timestamp: new Date().toISOString()
    });
}

/**
 * Get connected clients count
 * @returns {number} Number of connected clients
 */
function getConnectedClientsCount() {
    return connectedClients;
}

module.exports = {
    initializeWebSocket,
    broadcastMetricsUpdate,
    broadcastAnomalyDetected,
    broadcastSystemStatus,
    getConnectedClientsCount
};
