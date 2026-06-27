import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// Admin: list all students
router.get('/', requireAdmin, (req, res) => {
  const db = getDb();
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at, u.delete_requested_at,
      COUNT(DISTINCT tj.id) as total_trades,
      SUM(CASE WHEN tj.pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
      MAX(tj.created_at) as last_trade_at
    FROM users u
    LEFT JOIN trade_journals tj ON tj.student_id = u.id
    WHERE u.role = 'student' AND u.is_deleted = 0
    GROUP BY u.id
    ORDER BY u.name
  `).all();
  res.json(students);
});

// Admin: create student
router.post('/', requireAdmin, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: 'All fields required' }); return; }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(id, name, email, bcrypt.hashSync(password, 10), 'student');
  res.status(201).json({ id, name, email, role: 'student' });
});

// Admin: get student detail
router.get('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(user);
});

// Admin: delete student
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET is_deleted = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Student: request account deletion
router.post('/me/request-delete', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET delete_requested_at = datetime("now") WHERE id = ?').run(req.user!.id);
  res.json({ ok: true, delete_requested_at: new Date().toISOString() });
});

// Student: cancel account deletion
router.post('/me/cancel-delete', (req: AuthRequest, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET delete_requested_at = NULL WHERE id = ?').run(req.user!.id);
  res.json({ ok: true });
});

// Student: update profile
router.put('/me', (req: AuthRequest, res) => {
  const { name, password } = req.body;
  const db = getDb();
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(name || req.user!.name, hash, req.user!.id);
  } else if (name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user!.id);
  }
  res.json({ ok: true });
});

export default router;
