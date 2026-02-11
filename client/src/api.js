import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auth API
export const authAPI = {
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// Channels API
export const channelsAPI = {
  getAll: () => api.get('/api/channels'),
  getById: (id) => api.get(`/api/channels/${id}`),
  create: (data) => api.post('/api/channels', data),
  update: (id, data) => api.put(`/api/channels/${id}`, data),
  delete: (id) => api.delete(`/api/channels/${id}`)
};

// Messages API
export const messagesAPI = {
  getChannelMessages: (channelId, params) =>
    api.get(`/api/messages/channel/${channelId}`, { params }),
  getDirectMessages: (userId, params) =>
    api.get(`/api/messages/direct/${userId}`, { params }),
  getUnreadCounts: () => api.get('/api/messages/unread-counts')
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/api/users', { params }),
  getById: (id) => api.get(`/api/users/${id}`),
  search: (query) => api.get(`/api/users/search/${query}`)
};

export default api;
