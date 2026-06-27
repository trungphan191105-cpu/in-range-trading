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

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
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

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
