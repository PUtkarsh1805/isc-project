import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear local auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('username');
      // Redirect to login or dispatch logout action
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username, password, publicKey) =>
    api.post('/auth/register', { username, password, public_key: publicKey }),
  
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  
  logout: () =>
    api.post('/auth/logout'),
  
  verifySession: () =>
    api.get('/auth/verify'),
};

export const chatAPI = {
  getUsers: () =>
    api.get('/chat/users'),
  
  getPublicKey: (username) =>
    api.get(`/chat/public-key/${username}`),
  
  sendMessage: (messageData) =>
    api.post('/chat/send', messageData),
  
  getMessages: (withUsername = null) =>
    api.get('/chat/messages', {
      params: withUsername ? { with: withUsername } : {},
    }),
  
  getConversations: () =>
    api.get('/chat/conversations'),
  
  searchUsers: (query) =>
    api.get('/chat/search-users', { params: { q: query } }),
};

export default api;