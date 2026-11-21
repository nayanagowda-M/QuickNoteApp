const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const config = require('../config');

// Helper to validate email format
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * POST /api/auth/register
 * Register a new user account
 */
exports.register = (req, res, next) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Check empty fields
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Please fill in all fields (email, password, confirm password).' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check password mismatch
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Check if email already exists
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = checkStmt.get(trimmedEmail);

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password securely (never plain text)
    const saltRounds = 10;
    const passwordHash = bcrypt.hashSync(password, saltRounds);

    // Insert user into database
    const insertStmt = db.prepare(`
      INSERT INTO users (email, password_hash, created_at)
      VALUES (?, ?, datetime('now'))
    `);
    const result = insertStmt.run(trimmedEmail, passwordHash);
    const userId = Number(result.lastInsertRowid);

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { id: userId, email: trimmedEmail },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: userId,
        email: trimmedEmail
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticate existing user
 */
exports.login = (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check empty fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user by email
    const queryStmt = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
    const user = queryStmt.get(trimmedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    // Compare password with stored bcrypt hash
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
exports.getMe = (req, res, next) => {
  try {
    const stmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
    const user = stmt.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Informational logout endpoint
 */
exports.logout = (req, res) => {
  return res.status(200).json({ message: 'Logged out successfully.' });
};
