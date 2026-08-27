import axios from 'axios';

const rawEnvUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').trim();

export const API_BASE_URL = (() => {
  if (/^https?:\/\//i.test(rawEnvUrl)) {
    return rawEnvUrl;
  }
  if (rawEnvUrl.includes('localhost') || rawEnvUrl.includes('127.0.0.1')) {
    return `http://${rawEnvUrl}`;
  }
  return `https://${rawEnvUrl}`;
})();

export const SERVER_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch (e) {
    return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  }
})();

export const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${SERVER_ORIGIN}${cleanPath}`;
};

export const getWsUrl = (path = '/api/v1/wa/ws') => {
  try {
    const urlObj = new URL(API_BASE_URL);
    const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${wsProtocol}//${urlObj.host}${cleanPath}`;
  } catch (e) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//localhost:8000/api/v1/wa/ws`;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for handling 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const softDeleteItem = async (itemId, itemObj = {}) => {
  if (!itemId) return;
  await api.patch(`/items/${itemId}`, { is_active: false }).catch(() => {});
  await api.put(`/items/${itemId}`, { ...itemObj, is_active: false }).catch(() => {});
  await api.put(`/items/${itemId}/status`, { is_active: false }).catch(() => {});
  await api.patch(`/items/${itemId}/status`, { is_active: false }).catch(() => {});
  await api.delete(`/items/${itemId}`).catch(() => {});
};

export default api;
