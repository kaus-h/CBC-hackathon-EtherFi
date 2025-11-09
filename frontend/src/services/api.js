import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  config => {
    console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    console.error('[API Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const metricsApi = {
  getCurrent: () => api.get('/metrics/current'),
  getHistorical: (days = 7, metric = 'all') =>
    api.get(`/metrics/historical?days=${days}&metric=${metric}`)
};

export const anomaliesApi = {
  getRecent: (limit = 10, severity = 'all') =>
    api.get(`/anomalies?limit=${limit}&severity=${severity}`),
  getById: (id) => api.get(`/anomalies/${id}`)
};

export const baselineApi = {
  get: (days = 30) => api.get(`/baseline?days=${days}`)
};

export const sentimentApi = {
  get: (hours = 24) => api.get(`/sentiment?hours=${hours}`)
};

export const systemApi = {
  getStatus: () => api.get('/system/status'),
  getHealth: () => api.get('/health')
};

export default api;
