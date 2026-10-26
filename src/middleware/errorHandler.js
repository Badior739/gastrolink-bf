/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Erreur interne du serveur.' : err.message;
  res.status(status).json({ error: message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route inexistante.' });
}

module.exports = { errorHandler, notFoundHandler };
