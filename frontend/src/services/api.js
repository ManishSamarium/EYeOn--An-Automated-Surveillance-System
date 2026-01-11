import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : 'http://localhost:5001/api';

console.log('API Base URL:', API_BASE_URL);

// Get token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create axios instance with default headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If sending FormData, let axios handle the Content-Type with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => apiClient.post('/auth/signup', data),
  login: (data) => apiClient.post('/auth/login', data),
  getCurrentUser: () => apiClient.get('/auth/me')
};

// Family APIs
export const familyAPI = {
  addMember: (formData) => apiClient.post('/family/add', formData),
  listMembers: () => apiClient.get('/family/list'),
  deleteMember: (id) => apiClient.delete(`/family/${id}`)
};

// Category APIs
export const categoryAPI = {
  addCategory: (formData) => apiClient.post('/category/add', formData),
  listCategories: () => apiClient.get('/category/list'),
  deleteCategory: (id) => apiClient.delete(`/category/${id}`)
};

// Surveillance APIs
export const surveillanceAPI = {
  start: () => apiClient.post('/surveillance/start'),
  stop: () => apiClient.post('/surveillance/stop'),
  getStatus: () => apiClient.get('/surveillance/status')
};

// Unknown APIs
export const unknownAPI = {
  listUnknowns: () => apiClient.get('/unknown/list'),
  assignToKnown: (id, data) => apiClient.post(`/unknown/assign/${id}`, data),
  deleteUnknown: (id) => apiClient.delete(`/unknown/${id}`)
};

// Notification APIs
export const notificationAPI = {
  listNotifications: () => apiClient.get('/notification/list'),
  processNotification: (id) => apiClient.put(`/notification/${id}/process`),
  classifyNotification: (id, data) => apiClient.put(`/notification/${id}/classify`, data),
  deleteNotification: (id) => apiClient.delete(`/notification/${id}`)
};

export default apiClient;
