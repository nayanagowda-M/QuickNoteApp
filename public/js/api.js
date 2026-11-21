/**
 * API Client
 * Wraps browser fetch with base URL, authentication headers, and standard error handling
 */

const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('notes_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    let data;

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { text: await res.text() };
    }

    if (!res.ok) {
      // If unauthorized, token is invalid or expired
      if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        localStorage.removeItem('notes_auth_token');
        localStorage.removeItem('notes_user_email');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }

      const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// Authentication API helpers
export const AuthAPI = {
  register: (email, password, confirmPassword) =>
    apiRequest('/auth/register', { method: 'POST', body: { email, password, confirmPassword } }),

  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),

  getMe: () =>
    apiRequest('/auth/me', { method: 'GET' }),

  logout: () =>
    apiRequest('/auth/logout', { method: 'POST' })
};

// Notes API helpers
export const NotesAPI = {
  getNotes: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`/notes${query}`, { method: 'GET' });
  },

  getNoteById: (id) =>
    apiRequest(`/notes/${id}`, { method: 'GET' }),

  createNote: (title, content) =>
    apiRequest('/notes', { method: 'POST', body: { title, content } }),

  updateNote: (id, title, content) =>
    apiRequest(`/notes/${id}`, { method: 'PUT', body: { title, content } }),

  deleteNote: (id) =>
    apiRequest(`/notes/${id}`, { method: 'DELETE' })
};
