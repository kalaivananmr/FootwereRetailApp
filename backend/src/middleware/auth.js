const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'smartfoot_jwt_secret_change_in_production_2024';

function authenticate(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

function authorize(...roles) {
  return (req, res, next) => { if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' }); next(); };
}

function generateToken(user) {
  return jwt.sign({ id: user.id, shop_id: user.shop_id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authenticate, authorize, generateToken };
