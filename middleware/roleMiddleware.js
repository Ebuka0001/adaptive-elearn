// middleware/roleMiddleware.js

module.exports = (roles = []) => (req, res, next) => {
  // Normalize roles: accept string or array
  let allowed = roles;
  if (typeof roles === 'string') {
    allowed = [roles];
  }
  if (!Array.isArray(allowed)) allowed = [];

  // If empty array (no roles) => allow any authenticated user
  if (allowed.length === 0) return next();

  // Ensure auth middleware attached req.user
  if (!req.user) return res.status(401).json({ message: 'No user' });

  // role must exist on user
  if (!req.user.role) return res.status(403).json({ message: 'Forbidden - role missing' });

  if (!allowed.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  return next();
};
