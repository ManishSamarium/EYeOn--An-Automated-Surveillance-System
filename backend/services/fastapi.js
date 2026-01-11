import axios from 'axios';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
const SYSTEM_TOKEN = process.env.SYSTEM_TOKEN || 'system-internal-token';

console.log('FastAPI Service initialized:');
console.log('FASTAPI_URL =', FASTAPI_URL);

/**
 * Start surveillance for a user
 */
export const startSurveillance = async (userId) => {
  try {
    const response = await axios.post(
      `${FASTAPI_URL}/surveillance/start`,
      { userId },
      {
        headers: {
          'Authorization': `Bearer ${SYSTEM_TOKEN}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error starting surveillance:', error.message);
    throw error;
  }
};

/**
 * Stop surveillance
 */
export const stopSurveillance = async () => {
  try {
    const response = await axios.post(
      `${FASTAPI_URL}/surveillance/stop`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${SYSTEM_TOKEN}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error stopping surveillance:', error.message);
    throw error;
  }
};

/**
 * Reload face cache for a user (call when family/category updated)
 */
export const reloadUserFaceCache = async (userId) => {
  try {
    console.log(FASTAPI_URL);
    const response = await axios.post(
      `${FASTAPI_URL}/reload/${userId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${SYSTEM_TOKEN}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error reloading face cache:', error.message);
    throw error;
  }
};

/**
 * Get surveillance status
 */
export const getSurveillanceStatus = async () => {
  try {
    const response = await axios.get(
      `${FASTAPI_URL}/status`,
      {
        headers: {
          'Authorization': `Bearer ${SYSTEM_TOKEN}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting surveillance status:', error.message);
    throw error;
  }
};

export default {
  startSurveillance,
  stopSurveillance,
  reloadUserFaceCache,
  getSurveillanceStatus
};

export const reloadEncodings = (userId) =>
  axios.post(`${FASTAPI_URL}/reload/${userId}`);
