import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

if (
  !import.meta.env.VITE_API_BASE_URL &&
  typeof window !== 'undefined' &&
  !/^(localhost|127\.|\[::1\])/.test(window.location.hostname)
) {
  // eslint-disable-next-line no-console
  console.error(
    '[EYeOn] VITE_API_BASE_URL is not set but we are not on localhost. ' +
      'Falling back to http://localhost:5001/api which WILL FAIL in production. ' +
      'Set VITE_API_BASE_URL in your hosting provider and rebuild.'
  );
}

const getAuthToken = () => localStorage.getItem('token');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (data) => apiClient.post('/auth/signup', data),
  login: (data) => apiClient.post('/auth/login', data),
  getCurrentUser: () => apiClient.get('/auth/me')
};

export const familyAPI = {
  addMember: (formData) =>
    apiClient.post('/family/add', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  listMembers: () => apiClient.get('/family/list'),
  deleteMember: (id) => apiClient.delete(`/family/${id}`)
};

export const categoryAPI = {
  addCategory: (formData) =>
    apiClient.post('/category/add', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  listCategories: () => apiClient.get('/category/list'),
  deleteCategory: (id) => apiClient.delete(`/category/${id}`)
};

export const surveillanceAPI = {
  start: () => apiClient.post('/surveillance/start'),
  stop: () => apiClient.post('/surveillance/stop'),
  getStatus: () => apiClient.get('/surveillance/status')
};

export const unknownAPI = {
  listUnknowns: () => apiClient.get('/unknown/list'),
  assignToKnown: (data) => apiClient.post('/unknown/assign', data),
  deleteUnknown: (id) => apiClient.delete(`/unknown/${id}`),
  capture: (formData) =>
    apiClient.post('/unknown/capture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

export const notificationAPI = {
  list: () => apiClient.get('/notification/list'),
  markRead: (id) => apiClient.post(`/notification/mark-read/${id}`),
  markAllRead: () => apiClient.post('/notification/mark-all-read'),
  remove: (id) => apiClient.delete(`/notification/${id}`)
};

export default apiClient;
