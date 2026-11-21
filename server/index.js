const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/authRoutes');
const notesRoutes = require('./routes/notesRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve frontend static assets
const publicPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

// Catch-all handler to serve SPA index.html for any GET navigation (outside /api)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(publicPath, 'index.html'));
  }
  next();
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server if run directly
if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`=================================================`);
    console.log(` Notes Application Server running!`);
    console.log(` Local: http://localhost:${config.PORT}`);
    console.log(` Database: ${config.DB_PATH}`);
    console.log(`=================================================`);
  });
}

module.exports = app;
