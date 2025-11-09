import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {
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
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
    });

    // Set up event listeners
    Object.keys(this.listeners).forEach(event => {
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
