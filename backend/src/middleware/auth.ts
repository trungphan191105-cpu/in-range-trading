import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'trading-academy-secret-2024';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string; name: string };
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  let token = '';
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.query.token) {
    token = String(req.query.token);
  }
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

export function signToken(payload: { id: string; role: string; email: string; name: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
