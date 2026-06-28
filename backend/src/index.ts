import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb } from './db/schema';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import tradePlansRouter from './routes/tradePlans';
import journalsRouter from './routes/journals';
import uploadsRouter from './routes/uploads';
import reportsRouter from './routes/reports';
import accountsRouter from './routes/accounts';
import spendRouter from './routes/spend';
import quantRouter from './routes/quant';

// Initialize DB
getDb();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/trade-plans', tradePlansRouter);
app.use('/api/journals', journalsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/spend', spendRouter);
app.use('/api/quant', quantRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

// Setup: create admin or student account
app.post('/api/setup', (req, res) => {
  const { secret, name, email, password, role } = req.body;
  if (secret !== (process.env.SETUP_SECRET || 'ixr-setup-2025')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password required' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const hash = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(
      id, name, email, hash, role === 'student' ? 'student' : 'admin'
    );
    res.json({ ok: true, id, name, email, role: role === 'student' ? 'student' : 'admin' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Seed 2000 demo trades across 3 accounts for a given student
app.post('/api/seed-demo', (req, res) => {
  const { secret, studentId } = req.body;
  if (secret !== (process.env.SETUP_SECRET || 'ixr-setup-2025')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { v4: uuidv4 } = require('uuid');
    const db = getDb();

    const sid = studentId || db.prepare(`SELECT id FROM users WHERE role='student' LIMIT 1`).get() as any;
    const uid = typeof sid === 'string' ? sid : sid?.id;
    if (!uid) return res.status(400).json({ error: 'No student found. Register a student first.' });

    // 3 accounts
    const accounts = [
      { name: 'FTMO #1 — 100K',   prop_firm: 'FTMO',     account_type: 'prop', phase: 'funded',    initial_balance: 100000, color: '#5fd6a4' },
      { name: 'Apex #2 — 50K',    prop_firm: 'Apex',     account_type: 'prop', phase: 'challenge', initial_balance: 50000,  color: '#60A5FA' },
      { name: 'TFT #3 — 150K',    prop_firm: 'TFT',      account_type: 'prop', phase: 'funded',    initial_balance: 150000, color: '#A78BFA' },
    ];
    const accIds: string[] = [];
    for (const a of accounts) {
      const id = uuidv4();
      accIds.push(id);
      db.prepare(`INSERT OR IGNORE INTO accounts
        (id,student_id,name,prop_firm,account_type,phase,currency,initial_balance,current_balance,max_daily_loss_pct,max_total_drawdown_pct,profit_target_pct,color)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(id, uid, a.name, a.prop_firm, a.account_type, a.phase, 'USD', a.initial_balance, a.initial_balance, 5, 10, 8, a.color);
    }

    const symbols = ['NQ', 'ES'];
    const emotions = ['joy','calm','confident','sadness','anxiety','anger','fearful','greedy','revenge'];
    // Check if account_id column exists
    const cols = (db.prepare(`PRAGMA table_info(trade_journals)`).all() as any[]).map((c: any) => c.name);
    const hasAccountId = cols.includes('account_id');

    const insertTrade = db.prepare(hasAccountId
      ? `INSERT INTO trade_journals (id,student_id,account_id,date,symbol,direction,entry_price,exit_price,sl,tp,lot_size,pnl,rr_ratio,emotion,discipline_score,notes,type,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      : `INSERT INTO trade_journals (id,student_id,date,symbol,direction,entry_price,exit_price,sl,tp,lot_size,pnl,rr_ratio,emotion,discipline_score,notes,type,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );

    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const now = new Date();
    let count = 0;
    for (let i = 0; i < 2000; i++) {
      const daysAgo = Math.floor(rand(0, 540)); // ~18 months
      const d = new Date(now); d.setDate(d.getDate() - daysAgo);
      const dateStr = d.toISOString().split('T')[0];
      const sym = pick(symbols);
      const dir = pick(['long', 'short']);
      // NQ ~17000-21000, ES ~4500-5800
      const basePrice = sym === 'NQ' ? rand(17000, 21000) : rand(4500, 5800);
      const entry = parseFloat(basePrice.toFixed(2));
      const slDist = sym === 'NQ' ? rand(15, 60) : rand(8, 30);
      const tpDist = slDist * rand(1.2, 3.5);
      const sl = parseFloat((dir === 'long' ? entry - slDist : entry + slDist).toFixed(2));
      const tp = parseFloat((dir === 'long' ? entry + tpDist : entry - tpDist).toFixed(2));
      const won = Math.random() < 0.52; // 52% win rate
      const pnl = parseFloat(((won ? 1 : -1) * rand(50, 800)).toFixed(2));
      const exit = parseFloat((dir === 'long' ? entry + pnl / 2 : entry - pnl / 2).toFixed(2));
      const rr = parseFloat((tpDist / slDist).toFixed(2));
      const lots = parseFloat(rand(1, 5).toFixed(1));
      const accId = accIds[i % 3];

      const baseArgs = hasAccountId
        ? [uuidv4(), uid, accId, dateStr, sym, dir, entry, exit, sl, tp, lots, pnl, rr]
        : [uuidv4(), uid, dateStr, sym, dir, entry, exit, sl, tp, lots, pnl, rr];

      insertTrade.run(
        ...baseArgs,
        pick(emotions), Math.floor(rand(4, 10)),
        pick(['Followed plan', 'Revenge trade', 'Setup valid', 'FOMO entry', 'Patient entry', 'Missed SL move']),
        'idea', 'closed'
      );
      count++;
    }

    res.json({ ok: true, trades: count, accounts: accIds.length, studentId: uid });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
