const express = require('express');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(authenticate);

// GET shop profile
router.get('/', (req, res) => {
  const shop = getDb().prepare('SELECT * FROM shops WHERE id = ?').get(req.user.shop_id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  res.json(shop);
});

// PUT update shop profile
router.put('/', authorize('owner'), (req, res) => {
  const db = getDb();
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.user.shop_id);
  const { name, address, gst_number, phone } = req.body;
  db.prepare('UPDATE shops SET name=?,address=?,gst_number=?,phone=? WHERE id=?')
    .run(name??shop.name, address??shop.address, gst_number??shop.gst_number, phone??shop.phone, req.user.shop_id);
  res.json(db.prepare('SELECT * FROM shops WHERE id = ?').get(req.user.shop_id));
});

// POST upload logo (base64)
router.post('/logo', authorize('owner'), (req, res) => {
  const { logo_data } = req.body;
  if (!logo_data) return res.status(400).json({ error: 'No logo data provided' });
  if (logo_data.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Logo too large (max 2MB)' });
  getDb().prepare('UPDATE shops SET logo_data=? WHERE id=?').run(logo_data, req.user.shop_id);
  res.json({ success: true, logo_data });
});

// DELETE logo
router.delete('/logo', authorize('owner'), (req, res) => {
  getDb().prepare("UPDATE shops SET logo_data='' WHERE id=?").run(req.user.shop_id);
  res.json({ success: true });
});

// GET staff list
router.get('/staff', (req, res) => {
  const staff = getDb().prepare('SELECT id,name,phone,role,is_active,created_at FROM users WHERE shop_id=? ORDER BY created_at ASC').all(req.user.shop_id);
  res.json(staff);
});

// POST add staff
router.post('/staff', authorize('owner'), (req, res) => {
  const { name, phone, password, role } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'name, phone and password are required' });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE phone=?').get(phone);
  if (existing) return res.status(409).json({ error: 'Phone number already registered' });
  const id = uuidv4();
  db.prepare('INSERT INTO users (id,shop_id,name,phone,password_hash,role) VALUES (?,?,?,?,?,?)')
    .run(id, req.user.shop_id, name, phone, bcrypt.hashSync(password, 10), role || 'staff');
  res.status(201).json(db.prepare('SELECT id,name,phone,role,is_active,created_at FROM users WHERE id=?').get(id));
});

// PUT update staff
router.put('/staff/:id', authorize('owner'), (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=? AND shop_id=?').get(req.params.id, req.user.shop_id);
  if (!user) return res.status(404).json({ error: 'Staff not found' });
  const { name, phone, role, is_active } = req.body;
  db.prepare('UPDATE users SET name=?,phone=?,role=?,is_active=? WHERE id=?')
    .run(name??user.name, phone??user.phone, role??user.role, is_active??user.is_active, req.params.id);
  res.json(db.prepare('SELECT id,name,phone,role,is_active,created_at FROM users WHERE id=?').get(req.params.id));
});

// PUT change password
router.put('/staff/:id/password', authorize('owner'), (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=? AND shop_id=?').get(req.params.id, req.user.shop_id);
  if (!user) return res.status(404).json({ error: 'Staff not found' });
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ success: true });
});

// PUT change own password
router.put('/my-password', (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) return res.status(401).json({ error: 'Current password is wrong' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ success: true });
});

// DELETE staff (deactivate)
router.delete('/staff/:id', authorize('owner'), (req, res) => {
  const db = getDb();
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate yourself' });
  const r = db.prepare('UPDATE users SET is_active=0 WHERE id=? AND shop_id=?').run(req.params.id, req.user.shop_id);
  if (r.changes === 0) return res.status(404).json({ error: 'Staff not found' });
  res.json({ success: true });
});

module.exports = router;
