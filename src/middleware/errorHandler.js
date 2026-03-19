export function notFoundHandler(req, res) {
  res.status(404).json({
    message: 'Route not found.',
    path: req.originalUrl
  });
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);

  res.status(err.statusCode ?? 500).json({
    message: err.message ?? 'Internal server error.'
  });
}
