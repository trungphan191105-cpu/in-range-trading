import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { validateRequest, createJournalSchema, updateJournalSchema } from '../middleware/validate';

const router = Router();
router.use(verifyToken);

function getStudentId(req: AuthRequest): string {
  return (req.user!.role === 'admin' && req.query.studentId)
    ? String(req.query.studentId)
    : req.user!.id;
}

function parseScreenshots(row: any) {
  if (!row) return row;
  try { row.screenshots = JSON.parse(row.screenshots || '[]'); } catch { row.screenshots = []; }
  return row;
}

router.get('/', (req: AuthRequest, res) => {
  const db = getDb();
  const studentId = getStudentId(req);
  const { from, to, type, symbol, direction, status, account_id } = req.query;

  let sql = 'SELECT j.*, a.name as account_name, a.color as account_color FROM trade_journals j LEFT JOIN accounts a ON a.id = j.account_id WHERE j.student_id = ?';
  const params: any[] = [studentId];
  if (from) { sql += ' AND j.date >= ?'; params.push(from); }
  if (to) { sql += ' AND j.date <= ?'; params.push(to); }
  if (type) { sql += ' AND j.type = ?'; params.push(type); }
  if (symbol) { sql += ' AND j.symbol LIKE ?'; params.push(`%${symbol}%`); }
  if (direction) { sql += ' AND j.direction = ?'; params.push(direction); }
  if (status) { sql += ' AND j.status = ?'; params.push(status); }
  if (account_id) { sql += ' AND j.account_id = ?'; params.push(account_id); }
  sql += ' ORDER BY j.date DESC, j.created_at DESC';

  res.json((db.prepare(sql).all(...params) as any[]).map(parseScreenshots));
});

router.get('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const j = db.prepare('SELECT * FROM trade_journals WHERE id = ?').get(req.params.id) as any;
  if (!j) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && j.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  res.json(parseScreenshots(j));
});

router.post('/', validateRequest(createJournalSchema), (req: AuthRequest, res) => {
  const { date, symbol, direction, entry_price, exit_price, sl, tp, lot_size, pnl, rr_ratio, screenshot_url, screenshots, emotion, discipline_score, notes, type, status, linked_plan_id, account_id } = req.body;
  try {
    const db = getDb();
    const id = uuidv4();
    const screenshotsJson = JSON.stringify(Array.isArray(screenshots) ? screenshots : []);
    db.prepare(`
      INSERT INTO trade_journals (id, student_id, date, symbol, direction, entry_price, exit_price, sl, tp, lot_size, pnl, rr_ratio, screenshot_url, screenshots, emotion, discipline_score, notes, type, status, linked_plan_id, account_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user!.id, date, symbol||null, direction||null, entry_price||null, exit_price||null, sl||null, tp||null, lot_size||null, pnl||null, rr_ratio||null, screenshot_url||null, screenshotsJson, emotion||null, discipline_score||null, notes||null, type, status||'open', linked_plan_id||null, account_id||null);
    res.status(201).json(parseScreenshots(db.prepare('SELECT * FROM trade_journals WHERE id = ?').get(id)));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create journal entry' });
  }
});

router.put('/:id', validateRequest(updateJournalSchema), (req: AuthRequest, res) => {
  const db = getDb();
  const j = db.prepare('SELECT * FROM trade_journals WHERE id = ?').get(req.params.id) as any;
  if (!j) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && j.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const fields = ['date','symbol','direction','entry_price','exit_price','sl','tp','lot_size','pnl','rr_ratio','screenshot_url','emotion','discipline_score','notes','type','status','linked_plan_id','account_id','admin_feedback'];
  const updates = fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`);
  const vals = fields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);

  if (req.body.screenshots !== undefined) {
    updates.push('screenshots = ?');
    vals.push(JSON.stringify(Array.isArray(req.body.screenshots) ? req.body.screenshots : []));
  }

  if (updates.length) {
    db.prepare(`UPDATE trade_journals SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...vals, req.params.id);
  }
  res.json(parseScreenshots(db.prepare('SELECT * FROM trade_journals WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const j = db.prepare('SELECT * FROM trade_journals WHERE id = ?').get(req.params.id) as any;
  if (!j) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && j.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  db.prepare('DELETE FROM trade_journals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
