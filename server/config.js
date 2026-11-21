const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_development_secret_key_notes_app',
  DB_PATH: path.resolve(__dirname, '..', process.env.DB_FILE || 'data/notes.db')
};
