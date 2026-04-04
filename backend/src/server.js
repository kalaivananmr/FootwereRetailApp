require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(rateLimit({ windowMs: 15*60*1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/billing',   require('./routes/billing'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/shop',      require('./routes/shop'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => { if (!req.path.startsWith('/api')) res.sendFile(path.join(frontendDist, 'index.html')); });
}

app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Internal server error' }); });

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 SmartFoot API → http://localhost:${PORT}`);
    console.log(`🔑 Demo: phone=9876543210  password=demo1234\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });

module.exports = app;
