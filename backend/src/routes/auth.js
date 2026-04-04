const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database');
const { generateToken, authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/login', [
  body('phone').trim().notEmpty(),
  body('password').notEmpty(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const { phone, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid phone or password' });
  }
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(user.shop_id);
  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, phone: user.phone },
    shop: { id: shop.id, name: shop.name, gst_number: shop.gst_number, address: shop.address, phone: shop.phone }
  });
});

router.post('/register', [
  body('shop_name').trim().notEmpty(),
  body('name').trim().notEmpty(),
  body('phone').trim().notEmpty(),
  body('password').isLength({ min: 6 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const { shop_name, name, phone, password, address, gst_number } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) return res.status(409).json({ error: 'Phone number already registered' });
  const shopId = uuidv4();
  const userId = uuidv4();
  db.prepare('INSERT INTO shops (id, name, address, gst_number, phone) VALUES (?, ?, ?, ?, ?)').run(shopId, shop_name, address || '', gst_number || '', phone);
  db.prepare('INSERT INTO users (id, shop_id, name, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)').run(userId, shopId, name, phone, bcrypt.hashSync(password, 10), 'owner');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
  res.status(201).json({ token: generateToken(user), user: { id: user.id, name: user.name, role: user.role, phone: user.phone }, shop: { id: shop.id, name: shop.name } });
});

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, phone, role, shop_id FROM users WHERE id = ?').get(req.user.id);
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(user.shop_id);
  res.json({ user, shop });
});

module.exports = router;
