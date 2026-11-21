/**
 * Authentication Module
 * Manages user state, login, registration, validation, and session persistence
 */

import { AuthAPI } from './api.js';

export const Auth = {
  currentUser: null,
  token: null,

  // Initialize auth state from localStorage
  init() {
    this.token = localStorage.getItem('notes_auth_token');
    const storedEmail = localStorage.getItem('notes_user_email');
    if (this.token && storedEmail) {
      this.currentUser = { email: storedEmail };
    }
  },

  isAuthenticated() {
    return !!this.token;
  },

  // Verify current session with backend
  async checkSession() {
    if (!this.token) return false;
    try {
      const data = await AuthAPI.getMe();
      this.currentUser = data.user;
      localStorage.setItem('notes_user_email', data.user.email);
      return true;
    } catch (err) {
      this.logout();
      return false;
    }
  },

  // Handle user login
  async login(email, password) {
    const data = await AuthAPI.login(email, password);
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem('notes_auth_token', data.token);
    localStorage.setItem('notes_user_email', data.user.email);
    return data;
  },

  // Handle user registration
  async register(email, password, confirmPassword) {
    const data = await AuthAPI.register(email, password, confirmPassword);
    this.token = data.token;
    this.currentUser = data.user;
    localStorage.setItem('notes_auth_token', data.token);
    localStorage.setItem('notes_user_email', data.user.email);
    return data;
  },

  // Handle user logout
  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('notes_auth_token');
    localStorage.removeItem('notes_user_email');
    try {
      AuthAPI.logout().catch(() => {});
    } catch (e) {}
  }
};
