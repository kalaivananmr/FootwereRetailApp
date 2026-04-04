const express = require('express');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function getRange(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let from;
  if (period === 'today') from = today;
  else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate()-6); from = d.toISOString().split('T')[0]; }
  else if (period === 'month') { const d = new Date(now); d.setDate(d.getDate()-29); from = d.toISOString().split('T')[0]; }
  else { const d = new Date(now); d.setDate(d.getDate()-89); from = d.toISOString().split('T')[0]; }
  return { from: from+'T00:00:00.000Z', to: today+'T23:59:59.999Z' };
}

router.get('/summary', (req, res) => {
  const db = getDb();
  const { from, to } = getRange(req.query.period || 'month');
  const shop_id = req.user.shop_id;
  const s = db.prepare(`SELECT COUNT(*) as invoice_count, COALESCE(SUM(final_amount),0) as total_sales, COALESCE(SUM(discount),0) as total_discount FROM invoices WHERE shop_id=? AND date>=? AND date<=? AND status!='voided'`).get(shop_id, from, to);
  const c = db.prepare(`SELECT COALESCE(SUM(ii.cost_price*ii.quantity),0) as total_cost, COALESCE(SUM(ii.quantity),0) as total_items FROM invoice_items ii JOIN invoices i ON ii.invoice_id=i.id WHERE i.shop_id=? AND i.date>=? AND i.date<=? AND i.status!='voided'`).get(shop_id, from, to);
  const profit = s.total_sales - c.total_cost;
  res.json({ total_sales: Math.round(s.total_sales), total_cost: Math.round(c.total_cost), profit: Math.round(profit), margin_percent: s.total_sales > 0 ? parseFloat(((profit/s.total_sales)*100).toFixed(1)) : 0, invoice_count: s.invoice_count, total_items: c.total_items, total_discount: Math.round(s.total_discount) });
});

router.get('/trend', (req, res) => {
  const db = getDb();
  const period = req.query.period || 'month';
  const { from, to } = getRange(period);
  const shop_id = req.user.shop_id;
  const grp = period === 'today' ? "substr(date,1,13)" : "substr(date,1,10)";
  const rows = db.prepare(`SELECT ${grp} as label, COALESCE(SUM(i.final_amount),0) as sales, COALESCE(SUM(ii.cost_price*ii.quantity),0) as cost FROM invoices i LEFT JOIN invoice_items ii ON i.id=ii.invoice_id WHERE i.shop_id=? AND i.date>=? AND i.date<=? AND i.status!='voided' GROUP BY ${grp} ORDER BY label`).all(shop_id, from, to);
  res.json(rows.map(r => ({ label: period==='today' ? r.label.split('T')[1]||r.label : r.label, sales: Math.round(r.sales), profit: Math.round(r.sales-r.cost), cost: Math.round(r.cost) })));
});

router.get('/top-products', (req, res) => {
  const db = getDb();
  const { from, to } = getRange(req.query.period || 'month');
  const limit = parseInt(req.query.limit) || 8;
  const rows = db.prepare(`SELECT ii.brand_name, ii.article_number, ii.color, SUM(ii.quantity) as sold, SUM(ii.total) as revenue, SUM(ii.cost_price*ii.quantity) as cost FROM invoice_items ii JOIN invoices i ON ii.invoice_id=i.id WHERE i.shop_id=? AND i.date>=? AND i.date<=? AND i.status!='voided' GROUP BY ii.article_number,ii.color ORDER BY sold DESC`).all(req.user.shop_id, from, to);
  res.json(rows.slice(0, limit).map(p => ({ ...p, profit: Math.round(p.revenue - p.cost), revenue: Math.round(p.revenue), cost: Math.round(p.cost), name: `${p.brand_name} ${p.article_number}` })));
});

router.get('/brands', (req, res) => {
  const db = getDb();
  const { from, to } = getRange(req.query.period || 'month');
  const rows = db.prepare(`SELECT ii.brand_name, SUM(ii.total) as revenue, SUM(ii.quantity) as sold FROM invoice_items ii JOIN invoices i ON ii.invoice_id=i.id WHERE i.shop_id=? AND i.date>=? AND i.date<=? AND i.status!='voided' GROUP BY ii.brand_name ORDER BY revenue DESC`).all(req.user.shop_id, from, to);
  const tot = rows.reduce((s,b)=>s+b.revenue,0);
  res.json(rows.map(b => ({ ...b, revenue: Math.round(b.revenue), percent: tot>0 ? parseFloat(((b.revenue/tot)*100).toFixed(1)) : 0 })));
});

router.get('/sizes', (req, res) => {
  const db = getDb();
  const { from, to } = getRange(req.query.period || 'month');
  const rows = db.prepare(`SELECT ii.size, SUM(ii.quantity) as sold FROM invoice_items ii JOIN invoices i ON ii.invoice_id=i.id WHERE i.shop_id=? AND i.date>=? AND i.date<=? AND i.status!='voided' GROUP BY ii.size ORDER BY sold DESC`).all(req.user.shop_id, from, to);
  res.json(rows);
});

router.get('/payments', (req, res) => {
  const db = getDb();
  const { from, to } = getRange(req.query.period || 'month');
  const rows = db.prepare(`SELECT payment_mode, COUNT(*) as count, SUM(final_amount) as total FROM invoices WHERE shop_id=? AND date>=? AND date<=? AND status!='voided' GROUP BY payment_mode`).all(req.user.shop_id, from, to);
  const tot = rows.reduce((s,p)=>s+p.total,0);
  res.json(rows.map(p => ({ ...p, total: Math.round(p.total), percent: tot>0 ? parseFloat(((p.total/tot)*100).toFixed(1)) : 0 })));
});

router.get('/dead-stock', (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days)||30;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-days);
  const rows = db.prepare(`SELECT p.* FROM products p WHERE p.shop_id=? AND p.quantity>0 AND p.id NOT IN (SELECT DISTINCT ii.product_id FROM invoice_items ii JOIN invoices i ON ii.invoice_id=i.id WHERE i.date>=? AND i.status!='voided') ORDER BY p.quantity DESC`).all(req.user.shop_id, cutoff.toISOString());
  res.json(rows);
});

module.exports = router;
