import axios from 'axios';

const FASTAPI = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: FASTAPI,
  timeout: 5000
});

export const startSurveillance = (userId) =>
  client.post(`/start/${userId}`);

export const stopSurveillance = (userId) =>
  client.post(`/stop/${userId}`);

export const getSurveillanceStatus = (userId) =>
  client.get(`/status/${userId}`);

export const reloadEncodings = (userId) =>
  client.post(`/reload/${userId}`);

export const buildImageUrl = (req, relativePath) => {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/${relativePath.replace(/^\/+/, '')}`;
};
