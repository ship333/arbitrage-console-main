import axios from 'axios';
import { getApiBaseUrl } from './env';

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const fetchMetrics = async () => {
  const { data } = await api.get('/metrics');
  return data;
};

export const fetchOpportunities = async () => {
  const { data } = await api.get('/opportunities');
  return data;
};

export const startBot = async (strategy: string) => {
  const { data } = await api.post('/bot/start', { strategy });
  return data;
};

export const stopBot = async () => {
  const { data } = await api.post('/bot/stop');
  return data;
};

export const updateCalibration = async (pair: string, params: { k: number; alpha: number }) => {
  const { data } = await api.post('/calibration/update', { pair, ...params });
  return data;
};

export const fetchCalibrationStatus = async () => {
  const { data } = await api.get('/calibration/status');
  return data;
};
