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

// One-time setup: create admin account (safe to call multiple times)
app.post('/api/setup', (req, res) => {
  const { secret } = req.body;
  if (secret !== (process.env.SETUP_SECRET || 'ixr-setup-2025')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const db = getDb();
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT OR IGNORE INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(
      uuidv4(), 'Admin', 'admin@ixr.com', hash, 'admin'
    );
    res.json({ ok: true, email: 'admin@ixr.com', password: 'admin123' });
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
