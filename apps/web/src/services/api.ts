import axios from 'axios';

const api = axios.create({
  baseURL: '/api', /** Proxied to NestJS via Vite */
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ztteam_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
