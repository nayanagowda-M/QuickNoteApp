/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Server Error]', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 404 Route Not Found handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found.`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
