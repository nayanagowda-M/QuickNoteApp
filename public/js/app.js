/**
 * Application Entry & Router
 * Connects Auth and Notes modules, handles route transitions, and UI interactions
 */

import { Auth } from './auth.js';
import { Notes, showToast } from './notes.js';

class App {
  constructor() {
    this.authScreen = document.getElementById('auth-screen');
    this.notesScreen = document.getElementById('notes-screen');
    this.loginCard = document.getElementById('login-card');
    this.registerCard = document.getElementById('register-card');

    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');

    this.loginEmail = document.getElementById('login-email');
    this.loginPassword = document.getElementById('login-password');
    this.loginEmailError = document.getElementById('login-email-error');
    this.loginPasswordError = document.getElementById('login-password-error');
    this.loginAlert = document.getElementById('login-alert');

    this.registerEmail = document.getElementById('register-email');
    this.registerPassword = document.getElementById('register-password');
    this.registerConfirmPassword = document.getElementById('register-confirm-password');
    this.registerEmailError = document.getElementById('register-email-error');
    this.registerPasswordError = document.getElementById('register-password-error');
    this.registerConfirmError = document.getElementById('register-confirm-error');
    this.registerAlert = document.getElementById('register-alert');

    this.switchToRegisterBtn = document.getElementById('switch-to-register');
    this.switchToLoginBtn = document.getElementById('switch-to-login');
    this.logoutBtn = document.getElementById('logout-btn');
    this.currentUserEmail = document.querySelector('.user-email-text');
  }

  async start() {
    Auth.init();
    Notes.init();
    this.bindEvents();

    // Check if user has an active session
    if (Auth.isAuthenticated()) {
      const isValid = await Auth.checkSession();
      if (isValid) {
        this.showNotesScreen();
        return;
      }
    }

    // Default to login screen
    this.showLoginScreen();
  }

  bindEvents() {
    // Auth card switching
    this.switchToRegisterBtn.addEventListener('click', () => this.showRegisterCard());
    this.switchToLoginBtn.addEventListener('click', () => this.showLoginCard());

    // Login form submission
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

    // Register form submission
    this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));

    // Logout button
    this.logoutBtn.addEventListener('click', () => this.handleLogout());

    // Listen for auth expiration events from API client
    window.addEventListener('auth:expired', () => {
      showToast('Session expired. Please log in again.', 'error');
      this.showLoginScreen();
    });

    // Real-time input validation cleanup
    [this.loginEmail, this.loginPassword].forEach(input => {
      input.addEventListener('input', () => this.clearFieldErrors(this.loginForm));
    });

    [this.registerEmail, this.registerPassword, this.registerConfirmPassword].forEach(input => {
      input.addEventListener('input', () => this.clearFieldErrors(this.registerForm));
    });
  }

  showLoginCard() {
    this.clearFieldErrors(this.loginForm);
    this.clearAlerts();
    this.registerCard.classList.add('hidden');
    this.loginCard.classList.remove('hidden');
    this.loginEmail.focus();
  }

  showRegisterCard() {
    this.clearFieldErrors(this.registerForm);
    this.clearAlerts();
    this.loginCard.classList.add('hidden');
    this.registerCard.classList.remove('hidden');
    this.registerEmail.focus();
  }

  showLoginScreen() {
    this.notesScreen.classList.add('hidden');
    this.authScreen.classList.remove('hidden');
    this.showLoginCard();
  }

  showNotesScreen() {
    this.authScreen.classList.add('hidden');
    this.notesScreen.classList.remove('hidden');

    if (Auth.currentUser && Auth.currentUser.email) {
      this.currentUserEmail.textContent = Auth.currentUser.email;
    }

    // Load notes for the authenticated user
    Notes.loadNotes();
  }

  clearFieldErrors(form) {
    const errorSpans = form.querySelectorAll('.field-error');
    errorSpans.forEach(span => span.textContent = '');
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => input.classList.remove('has-error'));
  }

  clearAlerts() {
    this.loginAlert.classList.add('hidden');
    this.loginAlert.textContent = '';
    this.registerAlert.classList.add('hidden');
    this.registerAlert.textContent = '';
  }

  showErrorAlert(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
  }

  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  async handleLogin(e) {
    e.preventDefault();
    this.clearFieldErrors(this.loginForm);
    this.clearAlerts();

    const email = this.loginEmail.value.trim();
    const password = this.loginPassword.value;

    let hasError = false;

    if (!email) {
      this.loginEmailError.textContent = 'Email is required.';
      this.loginEmail.classList.add('has-error');
      hasError = true;
    } else if (!this.isValidEmail(email)) {
      this.loginEmailError.textContent = 'Please enter a valid email address.';
      this.loginEmail.classList.add('has-error');
      hasError = true;
    }

    if (!password) {
      this.loginPasswordError.textContent = 'Password is required.';
      this.loginPassword.classList.add('has-error');
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = document.getElementById('login-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Logging in...</span>';

    try {
      await Auth.login(email, password);
      showToast('Logged in successfully!', 'success');
      this.loginForm.reset();
      this.showNotesScreen();
    } catch (err) {
      this.showErrorAlert(this.loginAlert, err.message || 'Incorrect email or password.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Log In</span>';
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    this.clearFieldErrors(this.registerForm);
    this.clearAlerts();

    const email = this.registerEmail.value.trim();
    const password = this.registerPassword.value;
    const confirmPassword = this.registerConfirmPassword.value;

    let hasError = false;

    if (!email) {
      this.registerEmailError.textContent = 'Email is required.';
      this.registerEmail.classList.add('has-error');
      hasError = true;
    } else if (!this.isValidEmail(email)) {
      this.registerEmailError.textContent = 'Please enter a valid email address.';
      this.registerEmail.classList.add('has-error');
      hasError = true;
    }

    if (!password) {
      this.registerPasswordError.textContent = 'Password is required.';
      this.registerPassword.classList.add('has-error');
      hasError = true;
    } else if (password.length < 6) {
      this.registerPasswordError.textContent = 'Password must be at least 6 characters.';
      this.registerPassword.classList.add('has-error');
      hasError = true;
    }

    if (!confirmPassword) {
      this.registerConfirmError.textContent = 'Please confirm your password.';
      this.registerConfirmPassword.classList.add('has-error');
      hasError = true;
    } else if (password !== confirmPassword) {
      this.registerConfirmError.textContent = 'Passwords do not match.';
      this.registerConfirmPassword.classList.add('has-error');
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = document.getElementById('register-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating Account...</span>';

    try {
      await Auth.register(email, password, confirmPassword);
      showToast('Account created successfully!', 'success');
      this.registerForm.reset();
      this.showNotesScreen();
    } catch (err) {
      this.showErrorAlert(this.registerAlert, err.message || 'Failed to create account.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Create Account</span>';
    }
  }

  handleLogout() {
    Auth.logout();
    showToast('Logged out successfully.', 'info');
    this.showLoginScreen();
  }
}

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
