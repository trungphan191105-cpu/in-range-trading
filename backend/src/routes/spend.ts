import { Router } from 'express';
import { getDb } from '../db/schema';
import { v4 as uuid } from 'uuid';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// Summary MUST be before /:id routes to avoid being caught as an id param
router.get('/summary', (req: any, res) => {
  const db = getDb();
  const uid = req.user.id;
  const rows = db.prepare(`
    SELECT type, SUM(amount) as total, COUNT(*) as count
    FROM spend_payout WHERE student_id=? GROUP BY type
  `).all(uid) as any[];
  const spend = rows.find(r => r.type === 'spend')?.total || 0;
  const payout = rows.find(r => r.type === 'payout')?.total || 0;
  res.json({ spend, payout, net: payout - spend, entries: rows });
});

router.get('/', (req: any, res) => {
  const db = getDb();
  const uid = req.user.id;
  const rows = db.prepare(`
    SELECT sp.*, a.name as account_name, a.color as account_color
    FROM spend_payout sp
    LEFT JOIN accounts a ON sp.account_id = a.id
    WHERE sp.student_id = ?
    ORDER BY sp.date DESC, sp.created_at DESC
  `).all(uid);
  res.json(rows);
});

router.post('/', (req: any, res) => {
  const db = getDb();
  const uid = req.user.id;
  const { date, type, category, amount, account_id, notes } = req.body;
  try {
    const id = uuid();
    db.prepare(`INSERT INTO spend_payout (id, student_id, date, type, category, amount, account_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, uid, date, type || 'spend', category || 'other', amount, account_id || null, notes || null);
    res.json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: any, res) => {
  const db = getDb();
  const uid = req.user.id;
  const { date, type, category, amount, account_id, notes } = req.body;
  db.prepare(`UPDATE spend_payout SET date=?, type=?, category=?, amount=?, account_id=?, notes=?, updated_at=datetime('now')
    WHERE id=? AND student_id=?`
  ).run(date, type, category, amount, account_id || null, notes || null, req.params.id, uid);
  res.json({ ok: true });
});

router.delete('/:id', (req: any, res) => {
  const db = getDb();
  const uid = req.user.id;
  db.prepare(`DELETE FROM spend_payout WHERE id=? AND student_id=?`).run(req.params.id, uid);
  res.json({ ok: true });
});

export default router;
