const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { from, to, payment_mode, page=1, limit=20 } = req.query;
  const shop_id = req.user.shop_id;
  const off = (parseInt(page)-1)*parseInt(limit);
  let sql = 'SELECT * FROM invoices WHERE shop_id=?';
  const params = [shop_id];
  if (from) { sql+=' AND date>=?'; params.push(from); }
  if (to) { sql+=' AND date<=?'; params.push(to+'T23:59:59Z'); }
  if (payment_mode) { sql+=' AND payment_mode=?'; params.push(payment_mode); }
  const all = db.prepare(sql+' ORDER BY date DESC').all(...params);
  res.json({ invoices: all.slice(off, off+parseInt(limit)), total: all.length, page: parseInt(page) });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id=? AND shop_id=?').get(req.params.id, req.user.shop_id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  try { invoice.payment_details = JSON.parse(invoice.payment_details || '[]'); } catch(e) { invoice.payment_details = []; }
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(req.params.id);
  const shop = db.prepare('SELECT * FROM shops WHERE id=?').get(req.user.shop_id);
  res.json({ ...invoice, items, shop });
});

router.post('/', [
  body('items').isArray({ min: 1 }),
  body('payment_mode').isIn(['cash','upi','card','credit','mixed']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const db = getDb();
  const { items, discount=0, discount_type='amount', payment_mode, payment_details=[], customer_name, customer_phone, gst_rate=0 } = req.body;
  const shop_id = req.user.shop_id;

  let subtotal = 0;
  const resolved = [];
  for (const item of items) {
    // Support both product_id lookup and manual entry
    let p = null;
    if (item.product_id) {
      p = db.prepare('SELECT * FROM products WHERE id=? AND shop_id=?').get(item.product_id, shop_id);
      if (!p) return res.status(400).json({ error: `Product not found: ${item.product_id}` });
      if (p.quantity < item.quantity) return res.status(400).json({ error: `Insufficient stock: ${p.brand_name} ${p.article_number} sz${p.size}` });
    }
    const sp = parseFloat(item.selling_price ?? (p ? p.mrp : item.mrp ?? 0));
    const qty = parseInt(item.quantity);
    const total = sp * qty;
    subtotal += total;
    resolved.push({ id: uuidv4(), p, item, qty, sp, total,
      brand_name: p ? p.brand_name : (item.brand_name || ''),
      article_number: p ? p.article_number : (item.article_number || ''),
      size: p ? p.size : (item.size || ''),
      color: p ? p.color : (item.color || ''),
      mrp: p ? p.mrp : (item.mrp || sp),
      cost_price: p ? p.cost_price : (item.cost_price || 0),
    });
  }

  const discAmt = discount_type==='percent' ? (subtotal*parseFloat(discount))/100 : parseFloat(discount);
  const afterDisc = subtotal - discAmt;
  // GST: MRP is inclusive, extract GST from price
  const gstAmt = parseFloat(gst_rate) > 0 ? afterDisc - (afterDisc*100)/(100+parseFloat(gst_rate)) : 0;
  const finalAmt = afterDisc;

  // Validate payment_details sum for mixed
  if (payment_mode === 'mixed' && payment_details.length > 0) {
    const paidTotal = payment_details.reduce((s, p) => s + parseFloat(p.amount||0), 0);
    if (Math.abs(paidTotal - finalAmt) > 1) {
      return res.status(400).json({ error: `Payment total (₹${paidTotal.toFixed(2)}) doesn't match invoice total (₹${finalAmt.toFixed(2)})` });
    }
  }

  const lastInv = db.prepare('SELECT invoice_number FROM invoices WHERE shop_id=? ORDER BY rowid DESC').get(shop_id);
  let nextNum = 1;
  if (lastInv) { const m = lastInv.invoice_number.match(/(\d+)$/); if(m) nextNum=parseInt(m[1])+1; }
  const invoice_number = `INV-${String(nextNum).padStart(5,'0')}`;
  const invId = uuidv4();
  const now = new Date().toISOString();
  const pdStr = JSON.stringify(payment_details.length > 0 ? payment_details : [{mode: payment_mode, amount: finalAmt}]);

  db.transaction(() => {
    db.prepare('INSERT INTO invoices (id,shop_id,invoice_number,date,subtotal,discount,discount_type,gst_rate,gst_amount,final_amount,payment_mode,payment_details,customer_name,customer_phone,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(invId,shop_id,invoice_number,now,subtotal,discAmt,discount_type,parseFloat(gst_rate),gstAmt,finalAmt,payment_mode,pdStr,customer_name||'',customer_phone||'',req.user.id);
    for (const ri of resolved) {
      db.prepare('INSERT INTO invoice_items (id,invoice_id,product_id,brand_name,article_number,size,color,quantity,mrp,selling_price,cost_price,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(ri.id,invId,ri.p?.id||'',ri.brand_name,ri.article_number,ri.size,ri.color,ri.qty,ri.mrp,ri.sp,ri.cost_price,ri.total);
      if (ri.p) db.prepare('UPDATE products SET quantity=quantity-?,updated_at=datetime("now") WHERE id=?').run(ri.qty,ri.p.id);
    }
  })();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id=?').get(invId);
  try { invoice.payment_details = JSON.parse(invoice.payment_details||'[]'); } catch(e) { invoice.payment_details=[]; }
  const invItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(invId);
  const shop = db.prepare('SELECT * FROM shops WHERE id=?').get(shop_id);
  res.status(201).json({ ...invoice, items: invItems, shop });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id=? AND shop_id=?').get(req.params.id, req.user.shop_id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status==='voided') return res.status(400).json({ error: 'Already voided' });
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id=?').all(req.params.id);
  db.transaction(() => {
    items.forEach(item => { if(item.product_id) db.prepare('UPDATE products SET quantity=quantity+? WHERE id=?').run(item.quantity, item.product_id); });
    db.prepare('UPDATE invoices SET status=? WHERE id=?').run('voided', req.params.id);
  })();
  res.json({ success: true });
});

module.exports = router;
