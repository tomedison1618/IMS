export function notFoundHandler(req, res) {
  res.status(404).json({
    message: 'Route not found.',
    path: req.originalUrl
  });
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);

  if (err.code === '23505') {
    return res.status(409).json({
      message: 'A record with the same unique value already exists.',
      details: err.detail
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      message: 'A referenced record does not exist.',
      details: err.detail
    });
  }

  if (err.code === '22P02') {
    return res.status(400).json({
      message: 'Invalid input format.',
      details: err.detail
    });
  }

  res.status(err.statusCode ?? 500).json({
    message: err.message ?? 'Internal server error.',
    ...(err.details !== undefined ? { details: err.details } : {})
  });
}
