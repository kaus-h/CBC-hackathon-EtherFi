import { io } from 'socket.io-client';

// Use production URL when deployed, localhost for development
const WS_URL = import.meta.env.VITE_WS_URL
  || (import.meta.env.PROD
    ? 'https://etherfi-anomanly.up.railway.app'
    : 'http://localhost:3001');

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {
      'connect': [],
      'disconnect': [],
      'error': [],
      'metrics:update': [],
      'anomaly:detected': [],
      'system:status': [],
      'connection:success': [],
      'heartbeat': []
    };
  }

  connect() {
    if (this.socket?.connected) {
      console.log('[WS] Already connected');
      return;
    }

    console.log('[WS] Connecting to', WS_URL);

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected:', this.socket.id);
      // Trigger custom connect listeners
      this.listeners['connect'].forEach(callback => callback());
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      // Trigger custom disconnect listeners
      this.listeners['disconnect'].forEach(callback => callback(reason));
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      // Trigger custom error listeners
      this.listeners['error'].forEach(callback => callback(error));
    });

    // Set up event listeners for custom events
    Object.keys(this.listeners).forEach(event => {
      // Skip Socket.io built-in events (already handled above)
      if (['connect', 'disconnect', 'error'].includes(event)) return;

      this.socket.on(event, (data) => {
        console.log(`[WS] Event: ${event}`, data);
        this.listeners[event].forEach(callback => callback(data));
      });
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('[WS] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    } else {
      console.warn(`[WS] Unknown event: ${event}`);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export default new WebSocketService();
