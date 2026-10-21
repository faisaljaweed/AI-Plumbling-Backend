const crypto = require('node:crypto');
function same(a, b) { const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || '')); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); }
function issueLeadToken(id) {
  if (!process.env.CUSTOMER_TOKEN_SECRET) throw new Error('CUSTOMER_TOKEN_SECRET is required');
  const body = Buffer.from(JSON.stringify({ id: Number(id), exp: Date.now() + 7 * 86400000 })).toString('base64url');
  return `${body}.${crypto.createHmac('sha256', process.env.CUSTOMER_TOKEN_SECRET).update(body).digest('base64url')}`;
}
function leadFromToken(token) {
  if (!process.env.CUSTOMER_TOKEN_SECRET || typeof token !== 'string') return null;
  if(token.split('.').length!==2) return null;
  const [body, signature] = token.split('.');
  if (!body || !same(signature, crypto.createHmac('sha256', process.env.CUSTOMER_TOKEN_SECRET).update(body).digest('base64url'))) return null;
  try { const data = JSON.parse(Buffer.from(body, 'base64url').toString()); return data.exp > Date.now() && Number.isSafeInteger(data.id) ? data.id : null; } catch { return null; }
}
function identify(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '') || '';
  req.isAdmin = Boolean(process.env.ADMIN_API_KEY && same(token, process.env.ADMIN_API_KEY));
  req.customerLeadId = leadFromToken(token);
  next();
}
function admin(req, res, next) { return req.isAdmin ? next() : res.status(401).json({ success: false, message: 'Admin sign-in required.' }); }
function customer(req, res, next) {
  const id = Number(req.body?.lead_id || req.params.lead_id || req.params.id);
  return req.isAdmin || (req.customerLeadId && req.customerLeadId === id) ? next() : res.status(401).json({ success: false, message: 'This enquiry session is invalid or expired. Start a new enquiry.' });
}
function rateLimit(limit, windowMs) {
  const entries = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    for (const [k,v] of entries) if (v.until <= now) entries.delete(k);
    const item = entries.get(key) || { count: 0, until: now + windowMs };
    entries.set(key, item); item.count++;
    if (item.count > limit) return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    next();
  };
}
module.exports = { identify, admin, customer, issueLeadToken, rateLimit };
