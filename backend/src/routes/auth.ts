import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { signToken, verifyToken, AuthRequest } from '../middleware/auth';
import { validateRequest, loginSchema, registerSchema } from '../middleware/validate';

const router = Router();

router.post('/login', validateRequest(loginSchema), (req, res) => {
  const { email, password } = req.body;

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_deleted = 0').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Check grace period expiry
  if (user.delete_requested_at) {
    const deadline = new Date(user.delete_requested_at);
    deadline.setDate(deadline.getDate() + 30);
    if (new Date() > deadline) {
      db.prepare('UPDATE users SET is_deleted = 1 WHERE id = ?').run(user.id);
      res.status(401).json({ error: 'Account has been deleted' });
      return;
    }
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email, name: user.name });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_url: user.avatar_url, delete_requested_at: user.delete_requested_at } });
});

router.post('/register', validateRequest(registerSchema), (req, res) => {
  const { name, email, password } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(id, name, email, hash, 'student');

  const token = signToken({ id, role: 'student', email, name });
  res.status(201).json({ token, user: { id, name, email, role: 'student', avatar_url: null, delete_requested_at: null } });
});

router.get('/me', verifyToken, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, avatar_url, delete_requested_at FROM users WHERE id = ? AND is_deleted = 0').get(req.user!.id) as any;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
});

export default router;
