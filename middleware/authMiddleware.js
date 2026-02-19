// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

/**
 * Auth middleware:
 * - expects header: Authorization: Bearer <token>
 * - verifies token and attaches req.user = { id, name, role, ... } (payload)
 * - returns 401 on missing/invalid token with clear messages
 */

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
      // no header
      return res.status(401).json({ message: 'No authorization header provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      // malformed header format
      return res.status(401).json({ message: 'Authorization format must be: Bearer <token>' });
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({ message: 'Token missing' });
    }

    // Verify token in try/catch to handle jwt exceptions gracefully
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // don't log the token - log minimal info for debugging
      console.debug(`Auth verification failed (${err.name}): ${err.message} — ip=${req.ip} path=${req.originalUrl}`);
      return res.status(401).json({ message: 'Token error' });
    }

    // Attach user payload (or pick fields you need)
    req.user = payload;
    return next();
  } catch (err) {
    // unexpected error - log and return 500
    console.error('Auth middleware unexpected error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
};
