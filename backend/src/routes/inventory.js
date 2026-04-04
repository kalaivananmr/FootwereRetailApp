const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { search, brand, low_stock, page = 1, limit = 50 } = req.query;
  const shop_id = req.user.shop_id;
  const off = (parseInt(page) - 1) * parseInt(limit);
  let sql = 'SELECT * FROM products WHERE shop_id = ?';
  const params = [shop_id];
  if (search) { sql += ' AND (brand_name LIKE ? OR article_number LIKE ? OR color LIKE ?)'; const s=`%${search}%`; params.push(s,s,s); }
  if (brand) { sql += ' AND brand_name = ?'; params.push(brand); }
  if (low_stock === 'true') { sql += ' AND quantity <= low_stock_threshold'; }
  const allRows = db.prepare(sql + ' ORDER BY brand_name, article_number, size').all(...params);
  const total = allRows.length;
  const products = allRows.slice(off, off + parseInt(limit));
  res.json({ products, total, page: parseInt(page), limit: parseInt(limit) });
});

router.get('/brands', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT brand_name FROM products WHERE shop_id = ? ORDER BY brand_name').all(req.user.shop_id);
  res.json(rows.map(r => r.brand_name));
});

router.get('/alerts/low-stock', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM products WHERE shop_id = ? AND quantity <= low_stock_threshold ORDER BY quantity ASC').all(req.user.shop_id);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(req.params.id, req.user.shop_id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

router.post('/', [
  body('brand_name').trim().notEmpty(),
  body('article_number').trim().notEmpty(),
  body('size').trim().notEmpty(),
  body('mrp').isFloat({ gt: 0 }),
  body('quantity').isInt({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const { brand_name, article_number, size, color, mrp, cost_price, quantity, low_stock_threshold } = req.body;
  const shop_id = req.user.shop_id;
  const existing = db.prepare('SELECT id, quantity FROM products WHERE shop_id = ? AND article_number = ? AND size = ? AND color = ?').get(shop_id, article_number, size, color || '');
  if (existing) {
    db.prepare('UPDATE products SET quantity = quantity + ?, updated_at = datetime("now") WHERE id = ?').run(parseInt(quantity), existing.id);
    return res.json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id), action: 'updated' });
  }
  const id = uuidv4();
  db.prepare('INSERT INTO products (id, shop_id, brand_name, article_number, size, color, mrp, cost_price, quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, shop_id, brand_name, article_number, size, color || '', parseFloat(mrp), parseFloat(cost_price || 0), parseInt(quantity), parseInt(low_stock_threshold || 5));
  res.status(201).json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(id), action: 'created' });
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const p = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(req.params.id, req.user.shop_id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const { brand_name, article_number, size, color, mrp, cost_price, quantity, low_stock_threshold } = req.body;
  db.prepare('UPDATE products SET brand_name=?, article_number=?, size=?, color=?, mrp=?, cost_price=?, quantity=?, low_stock_threshold=?, updated_at=datetime("now") WHERE id=?')
    .run(brand_name??p.brand_name, article_number??p.article_number, size??p.size, color??p.color, mrp??p.mrp, cost_price??p.cost_price, quantity??p.quantity, low_stock_threshold??p.low_stock_threshold, req.params.id);
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const r = db.prepare('DELETE FROM products WHERE id = ? AND shop_id = ?').run(req.params.id, req.user.shop_id);
  if (r.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

module.exports = router;
