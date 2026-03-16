import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for adding Auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for handling token refresh and response structure
api.interceptors.response.use(
  (response) => {
    // If the response follows our standard wrapper format, unwrap it
    if (response.data && response.data.success === true) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper for streaming responses (SSE)
export const streamFetch = async (url, data, onMessage, onDone, onError) => {
  const token = localStorage.getItem('access_token');
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const result = JSON.parse(line.slice(6));
            if (result.type === 'chunk') {
              fullText += result.text;
              onMessage(result.text);
            } else if (result.type === 'done') {
              result.text = fullText;
              onDone(result);
            }
          } catch (e) {
            console.error('Error parsing SSE data', e);
          }
        }
      }
    }
  } catch (error) {
    if (onError) onError(error);
    else console.error('Stream error:', error);
  }
};

export const authApi = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (data) => api.post('/auth/register/', data),
  getProfile: () => api.get('/auth/profile/'),
  getUsage: () => api.get('/auth/usage/'),
  // API Key management
  listApiKeys: () => api.get('/auth/api-keys/'),
  createApiKey: (name) => api.post('/auth/api-keys/', { name }),
  revokeApiKey: (id) => api.delete(`/auth/api-keys/${id}/`),
};

export const documentApi = {
  list: () => api.get('/documents/'),
  upload: (formData) => api.post('/documents/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (id) => api.get(`/documents/${id}/`),
  delete: (id) => api.delete(`/documents/${id}/`),
  reprocess: (id) => api.post(`/documents/${id}/reprocess/`),
};

export const conversationApi = {
  list: () => api.get('/conversations/'),
  create: (data) => api.post('/conversations/', data),
  update: (id, data) => api.patch(`/conversations/${id}/`, data),
  get: (id) => api.get(`/conversations/${id}/`),
  getMessages: (id) => api.get(`/conversations/${id}/messages/`),
  chat: (id, message, include_context = true) => api.post(`/conversations/${id}/chat/`, {
    message,
    include_context
  }),
  chatStream: (id, message, include_context, onMessage, onDone, onError) =>
    streamFetch(`/conversations/${id}/chatStream/`, { message, include_context }, onMessage, onDone, onError),
  delete: (id) => api.delete(`/conversations/${id}/`),
  clear: (id) => api.post(`/conversations/${id}/clear/`),
};

export const analyticsApi = {
  getStats: () => api.get('/analytics/usage/'),
  getHistory: () => api.get('/analytics/usage/history/'),
  getCost: () => api.get('/analytics/cost-estimate/'),
  getAdminDashboard: () => api.get('/analytics/admin/dashboard/'),
};

export default api;
