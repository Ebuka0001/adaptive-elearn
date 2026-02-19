// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header provided' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({ message: 'Authorization format must be: Bearer <token>' });
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({ message: 'Token missing' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // minimal logging for debugging (no token printed)
      console.debug(`Auth verification failed (${err.name}): ${err.message} — ip=${req.ip} path=${req.originalUrl}`);
      return res.status(401).json({ message: 'Token error' });
    }

    // payload should contain an identifier (commonly `id`). Support both id and _id.
    const userId = payload.id || payload._id;
    if (!userId) {
      // If token doesn't include id, attach payload anyway (best-effort)
      req.user = payload;
      return next();
    }

    // Load fresh user from DB so we have role and current points/mastery, etc.
    try {
      const user = await User.findById(userId).lean();
      if (!user) return res.status(401).json({ message: 'User not found' });

      // Ensure mastery is a plain object (lean returns plain object)
      user.mastery = user.mastery || {};
      req.user = user;
      return next();
    } catch (dbErr) {
      console.error('Auth middleware DB error:', dbErr && dbErr.message ? dbErr.message : dbErr);
      return res.status(500).json({ message: 'Server error' });
    }
  } catch (err) {
    console.error('Auth middleware unexpected error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
};
