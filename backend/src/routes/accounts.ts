import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { verifyToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

function ownerId(req: AuthRequest) {
  return req.user!.role === 'admin' && req.query.studentId
    ? String(req.query.studentId)
    : req.user!.id;
}

// GET /api/accounts — list student's accounts with live PnL
router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const studentId = ownerId(req);

  const accounts = db.prepare(`
    SELECT
      a.*,
      COUNT(CASE WHEN j.status='closed' AND j.type='idea' THEN 1 END) as total_trades,
      SUM(CASE WHEN j.status='closed' AND j.type='idea' AND j.pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
      SUM(CASE WHEN j.status='closed' AND j.type='idea' THEN COALESCE(j.pnl,0) ELSE 0 END) as realized_pnl,
      COUNT(CASE WHEN j.status='open' AND j.type='idea' THEN 1 END) as open_trades
    FROM accounts a
    LEFT JOIN trade_journals j ON j.account_id = a.id
    WHERE a.student_id = ? AND a.status != 'deleted'
    GROUP BY a.id
    ORDER BY a.created_at
  `).all(studentId) as any[];

  res.json(accounts.map(a => ({
    ...a,
    pnl_pct: a.initial_balance ? ((a.realized_pnl || 0) / a.initial_balance * 100) : 0,
    drawdown_pct: a.current_balance < a.initial_balance
      ? ((a.initial_balance - a.current_balance) / a.initial_balance * 100)
      : 0,
  })));
});

// GET /api/accounts/:id
router.get('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const acc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as any;
  if (!acc) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && acc.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  res.json(acc);
});

// POST /api/accounts — create account
router.post('/', (req: AuthRequest, res) => {
  const { name, prop_firm, account_type, phase, currency, initial_balance, max_daily_loss_pct, max_total_drawdown_pct, profit_target_pct, color, logo_url, start_date } = req.body;
  if (!name || !initial_balance) { res.status(400).json({ error: 'name and initial_balance required' }); return; }
  const db = getDb();
  const id = uuidv4();
  const studentId = req.body.student_id && req.user!.role === 'admin' ? req.body.student_id : req.user!.id;
  db.prepare(`
    INSERT INTO accounts (id, student_id, name, prop_firm, account_type, phase, currency, initial_balance, current_balance, max_daily_loss_pct, max_total_drawdown_pct, profit_target_pct, color, logo_url, start_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, studentId, name, prop_firm || null, account_type || 'prop', phase || 'funded', currency || 'USD', Number(initial_balance), Number(initial_balance), max_daily_loss_pct || 5, max_total_drawdown_pct || 10, profit_target_pct || null, color || '#38bdf8', logo_url || null, start_date || null);
  res.status(201).json(db.prepare('SELECT * FROM accounts WHERE id = ?').get(id));
});

// PUT /api/accounts/:id — update
router.put('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const acc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as any;
  if (!acc) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && acc.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const { name, prop_firm, account_type, phase, currency, current_balance, max_daily_loss_pct, max_total_drawdown_pct, profit_target_pct, status, color, logo_url, start_date } = req.body;
  db.prepare(`UPDATE accounts SET
    name = ?, prop_firm = ?, account_type = ?, phase = ?, currency = ?, current_balance = ?,
    max_daily_loss_pct = ?, max_total_drawdown_pct = ?, profit_target_pct = ?,
    status = ?, color = ?, logo_url = ?, start_date = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? acc.name, prop_firm ?? acc.prop_firm, account_type ?? acc.account_type, phase ?? acc.phase,
    currency ?? acc.currency, current_balance ?? acc.current_balance,
    max_daily_loss_pct ?? acc.max_daily_loss_pct,
    max_total_drawdown_pct ?? acc.max_total_drawdown_pct,
    profit_target_pct ?? acc.profit_target_pct,
    status ?? acc.status, color ?? acc.color, logo_url !== undefined ? logo_url : acc.logo_url,
    start_date !== undefined ? start_date : acc.start_date, req.params.id
  );
  res.json(db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id));
});

// DELETE /api/accounts/:id — soft delete
router.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const acc = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id) as any;
  if (!acc) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && acc.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  db.prepare("UPDATE accounts SET status = 'deleted' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
