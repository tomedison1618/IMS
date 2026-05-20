export function notImplemented(operation) {
  return (req, res) => {
    res.status(501).json({
      message: `${operation} is not implemented yet.`,
      method: req.method,
      path: req.originalUrl
    });
  };
}
