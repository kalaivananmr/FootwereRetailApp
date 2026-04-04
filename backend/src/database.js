const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/smartfoot.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db = null;

class SyncDB {
  constructor(sqlDb) { this.sqlDb = sqlDb; this._saveTimer = null; }
  _schedSave() { if (this._saveTimer) clearTimeout(this._saveTimer); this._saveTimer = setTimeout(() => this._save(), 800); }
  _save() { try { fs.writeFileSync(DB_PATH, Buffer.from(this.sqlDb.export())); } catch(e) { console.error('DB save:', e.message); } }
  exec(sql) { this.sqlDb.run(sql); this._schedSave(); }
  pragma(str) { try { this.sqlDb.run('PRAGMA ' + str); } catch(e) {} }
  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        let stmt;
        try { stmt = self.sqlDb.prepare(sql); if (params.flat().length) stmt.bind(params.flat()); return stmt.step() ? stmt.getAsObject() : null; }
        catch(e) { console.error('get:', e.message); return null; } finally { if(stmt) stmt.free(); }
      },
      all(...params) {
        let stmt;
        try { stmt = self.sqlDb.prepare(sql); if (params.flat().length) stmt.bind(params.flat()); const rows=[]; while(stmt.step()) rows.push(stmt.getAsObject()); return rows; }
        catch(e) { console.error('all:', e.message); return []; } finally { if(stmt) stmt.free(); }
      },
      run(...params) {
        try { self.sqlDb.run(sql, params.flat()); self._schedSave(); return { changes: self.sqlDb.getRowsModified() }; }
        catch(e) { console.error('run:', e.message); throw e; }
      }
    };
  }
  transaction(fn) {
    const self = this;
    return function() { self.sqlDb.run('BEGIN'); try { fn(); self.sqlDb.run('COMMIT'); self._schedSave(); } catch(e) { self.sqlDb.run('ROLLBACK'); throw e; } };
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();
  let sqlDb;
  if (fs.existsSync(DB_PATH)) { sqlDb = new SQL.Database(fs.readFileSync(DB_PATH)); console.log('📂 Loaded existing database'); }
  else { sqlDb = new SQL.Database(); console.log('🆕 Created new database'); }
  db = new SyncDB(sqlDb);

  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT DEFAULT '',
      gst_number TEXT DEFAULT '', phone TEXT DEFAULT '',
      logo_data TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff', is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, brand_name TEXT NOT NULL,
      article_number TEXT NOT NULL, size TEXT NOT NULL, color TEXT DEFAULT '',
      mrp REAL NOT NULL, cost_price REAL DEFAULT 0, quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, invoice_number TEXT NOT NULL,
      date TEXT DEFAULT (datetime('now')), customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '', subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0, discount_type TEXT DEFAULT 'amount',
      gst_rate REAL DEFAULT 0, gst_amount REAL DEFAULT 0,
      final_amount REAL DEFAULT 0, payment_mode TEXT DEFAULT 'cash',
      payment_details TEXT DEFAULT '[]', status TEXT DEFAULT 'completed',
      created_by TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, product_id TEXT DEFAULT '',
      brand_name TEXT NOT NULL, article_number TEXT NOT NULL, size TEXT NOT NULL,
      color TEXT DEFAULT '', quantity INTEGER NOT NULL, mrp REAL NOT NULL,
      selling_price REAL NOT NULL, cost_price REAL DEFAULT 0, total REAL NOT NULL
    );
  `);

  // Migrations for existing DBs
  const migrations = [
    `ALTER TABLE shops ADD COLUMN logo_data TEXT DEFAULT ''`,
    `ALTER TABLE invoices ADD COLUMN gst_rate REAL DEFAULT 0`,
    `ALTER TABLE invoices ADD COLUMN payment_details TEXT DEFAULT '[]'`,
    `ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`,
    `ALTER TABLE invoice_items ADD COLUMN product_id TEXT DEFAULT ''`,
  ];
  migrations.forEach(m => { try { db.exec(m); } catch(e) {} });

  const c = db.prepare('SELECT COUNT(*) as c FROM shops').get();
  if (!c || parseInt(c.c) === 0) { console.log('🌱 Seeding...'); seedDemoData(); console.log('✅ Seeded'); }
  return db;
}

function seedDemoData() {
  const shopId = 'shop_demo_001';
  db.prepare('INSERT INTO shops (id,name,address,gst_number,phone) VALUES (?,?,?,?,?)').run(shopId,'SmartFoot Store','12, Main Street, Trichy, Tamil Nadu 620001','33AABCU9603R1ZP','9876543210');
  db.prepare('INSERT INTO users (id,shop_id,name,phone,password_hash,role) VALUES (?,?,?,?,?,?)').run(uuidv4(),shopId,'Store Owner','9876543210',bcrypt.hashSync('demo1234',10),'owner');
  db.prepare('INSERT INTO users (id,shop_id,name,phone,password_hash,role) VALUES (?,?,?,?,?,?)').run(uuidv4(),shopId,'Sales Staff','9876543211',bcrypt.hashSync('demo1234',10),'staff');

  const defs = [
    {brand:'Nike',article:'AIR-MAX-90',sizes:['6','7','8','9','10','11'],color:'White',mrp:8999,cost:5500},
    {brand:'Nike',article:'AIR-FORCE-1',sizes:['7','8','9','10'],color:'Black',mrp:7499,cost:4500},
    {brand:'Adidas',article:'ULTRA-BOOST-22',sizes:['7','8','9','10','11'],color:'Blue',mrp:12999,cost:8000},
    {brand:'Adidas',article:'STAN-SMITH',sizes:['6','7','8','9'],color:'White',mrp:5999,cost:3500},
    {brand:'Puma',article:'RS-X',sizes:['7','8','9','10'],color:'Red',mrp:6499,cost:3800},
    {brand:'Puma',article:'SUEDE-CLASSIC',sizes:['6','7','8','9','10'],color:'Navy',mrp:4999,cost:2900},
    {brand:'Reebok',article:'CLASSIC-LEATHER',sizes:['7','8','9'],color:'White',mrp:5499,cost:3200},
    {brand:'Skechers',article:'GO-RUN-600',sizes:['6','7','8','9','10','11'],color:'Grey',mrp:3999,cost:2200},
  ];
  const productList = [];
  defs.forEach(p => p.sizes.forEach(size => {
    const id = uuidv4(); const qty = Math.floor(Math.random()*18)+5;
    db.prepare('INSERT INTO products (id,shop_id,brand_name,article_number,size,color,mrp,cost_price,quantity) VALUES (?,?,?,?,?,?,?,?,?)').run(id,shopId,p.brand,p.article,size,p.color,p.mrp,p.cost,qty);
    productList.push({id,brand:p.brand,article:p.article,size,color:p.color,mrp:p.mrp,cost:p.cost});
  }));

  const modes = ['cash','upi','card']; let invNum=1;
  for (let d=89;d>=0;d--) {
    const date = new Date(); date.setDate(date.getDate()-d);
    const ds = date.toISOString().split('T')[0]+'T10:00:00.000Z';
    for (let i=0;i<Math.floor(Math.random()*6)+2;i++) {
      const invId=uuidv4(); let sub=0; const items=[];
      for(let j=0;j<Math.floor(Math.random()*3)+1;j++){
        const p=productList[Math.floor(Math.random()*productList.length)];
        const qty=Math.floor(Math.random()*2)+1; const sp=p.mrp*(Math.random()>0.7?0.95:1); const tot=sp*qty; sub+=tot;
        items.push([uuidv4(),invId,p.id,p.brand,p.article,p.size,p.color,qty,p.mrp,sp,p.cost,tot]);
      }
      const disc=Math.random()>0.85?100:0; const fin=Math.max(0,sub-disc);
      const mode=modes[Math.floor(Math.random()*modes.length)];
      db.prepare('INSERT INTO invoices (id,shop_id,invoice_number,date,subtotal,discount,final_amount,payment_mode,payment_details) VALUES (?,?,?,?,?,?,?,?,?)').run(invId,shopId,`INV-${String(invNum++).padStart(5,'0')}`,ds,sub,disc,fin,mode,JSON.stringify([{mode,amount:fin}]));
      items.forEach(it => db.prepare('INSERT INTO invoice_items (id,invoice_id,product_id,brand_name,article_number,size,color,quantity,mrp,selling_price,cost_price,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(...it));
    }
  }
}

function getDb() { if(!db) throw new Error('DB not initialized'); return db; }
module.exports = { initDatabase, getDb };
