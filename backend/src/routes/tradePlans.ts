import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';

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
  const { from, to, status } = req.query;

  let sql = 'SELECT * FROM trade_plans WHERE student_id = ?';
  const params: any[] = [studentId];
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to) { sql += ' AND date <= ?'; params.push(to); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY date DESC';

  res.json((db.prepare(sql).all(...params) as any[]).map(parseScreenshots));
});

router.get('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const plan = db.prepare('SELECT * FROM trade_plans WHERE id = ?').get(req.params.id) as any;
  if (!plan) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && plan.student_id !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' }); return;
  }
  res.json(parseScreenshots(plan));
});

router.post('/', (req: AuthRequest, res) => {
  const { date, title, market_bias, content, screenshot_url, screenshots } = req.body;
  if (!date || !title) { res.status(400).json({ error: 'date and title required' }); return; }
  const db = getDb();
  const id = uuidv4();
  const screenshotsJson = JSON.stringify(Array.isArray(screenshots) ? screenshots : []);
  db.prepare(`INSERT INTO trade_plans (id, student_id, date, title, market_bias, content, status, screenshot_url, screenshots) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`)
    .run(id, req.user!.id, date, title, market_bias || null, content || null, screenshot_url || null, screenshotsJson);
  res.status(201).json(parseScreenshots(db.prepare('SELECT * FROM trade_plans WHERE id = ?').get(id)));
});

router.put('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const plan = db.prepare('SELECT * FROM trade_plans WHERE id = ?').get(req.params.id) as any;
  if (!plan) { res.status(404).json({ error: 'Not found' }); return; }

  if (req.user!.role === 'admin') {
    const { grade, grade_comment, status } = req.body;
    db.prepare(`UPDATE trade_plans SET grade = ?, grade_comment = ?, status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?`)
      .run(grade ?? plan.grade, grade_comment ?? plan.grade_comment, status || null, req.params.id);
  } else {
    if (plan.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
    const { date, title, market_bias, content, status, screenshot_url, screenshots } = req.body;
    const screenshotsJson = screenshots !== undefined ? JSON.stringify(Array.isArray(screenshots) ? screenshots : []) : plan.screenshots;
    db.prepare(`UPDATE trade_plans SET date = ?, title = ?, market_bias = ?, content = ?, status = ?, screenshot_url = ?, screenshots = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(date ?? plan.date, title ?? plan.title, market_bias ?? plan.market_bias, content ?? plan.content, status ?? plan.status,
        screenshot_url !== undefined ? screenshot_url : plan.screenshot_url, screenshotsJson, req.params.id);
  }
  res.json(parseScreenshots(db.prepare('SELECT * FROM trade_plans WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req: AuthRequest, res) => {
  const db = getDb();
  const plan = db.prepare('SELECT * FROM trade_plans WHERE id = ?').get(req.params.id) as any;
  if (!plan) { res.status(404).json({ error: 'Not found' }); return; }
  if (req.user!.role !== 'admin' && plan.student_id !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }
  db.prepare('DELETE FROM trade_plans WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
