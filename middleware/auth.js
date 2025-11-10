const jwt = require('jsonwebtoken');
const { mongoose } = require('../models');

const auth = {};

auth.verifyToken = (req, res, next) => {
  // Allow existing Passport session users for server-rendered pages
  if (req.user && req.user.role) return next();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

auth.requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

auth.enforceOwnership = (getFilter) => async (req, res, next) => {
  try {
    req.ownershipFilter = await getFilter(req);
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Ownership check failed' });
  }
};

module.exports = auth;