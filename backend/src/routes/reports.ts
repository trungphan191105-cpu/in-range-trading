import { Router } from 'express';
import { getDb } from '../db/schema';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

function getStudentId(req: AuthRequest): string {
  return (req.user!.role === 'admin' && req.query.studentId)
    ? String(req.query.studentId)
    : req.user!.id;
}

// Stats for one student (or self)
router.get('/stats', (req: AuthRequest, res) => {
  const db = getDb();
  const studentId = getStudentId(req);
  const { from, to, account_id, account_ids } = req.query;

  let cond = 'student_id = ?';
  const params: any[] = [studentId];
  if (from) { cond += ' AND date >= ?'; params.push(from); }
  if (to) { cond += ' AND date <= ?'; params.push(to); }
  if (account_ids) {
    const ids = String(account_ids).split(',').filter(Boolean);
    if (ids.length) { cond += ` AND account_id IN (${ids.map(() => '?').join(',')})`;params.push(...ids); }
  } else if (account_id) { cond += ' AND account_id = ?'; params.push(account_id); }

  const trades = db.prepare(`SELECT * FROM trade_journals WHERE ${cond} AND type = 'idea' ORDER BY date`).all(...params) as any[];

  const total = trades.length;
  const closed = trades.filter(t => t.status === 'closed');
  const wins = closed.filter(t => t.pnl > 0).length;
  const losses = closed.filter(t => t.pnl < 0).length;
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossProfit = closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(closed.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const winRate = closed.length ? (wins / closed.length) * 100 : 0;
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const avgRR = trades.filter(t => t.rr_ratio).reduce((s, t, _, a) => s + t.rr_ratio / a.length, 0);

  // Best and worst trade
  const bestTrade = closed.reduce((b, t) => (!b || t.pnl > b.pnl) ? t : b, null as any);
  const worstTrade = closed.reduce((w, t) => (!w || t.pnl < w.pnl) ? t : w, null as any);

  // Equity curve
  let equity = 0;
  const equityCurve = closed.map(t => {
    equity += t.pnl || 0;
    return { date: t.date, equity: parseFloat(equity.toFixed(2)), pnl: t.pnl };
  });

  // Max drawdown
  let peak = 0, maxDD = 0, running = 0;
  for (const t of closed) {
    running += t.pnl || 0;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }

  // PnL by day (heatmap)
  const byDay: Record<string, number> = {};
  for (const t of closed) {
    byDay[t.date] = (byDay[t.date] || 0) + (t.pnl || 0);
  }
  const heatmap = Object.entries(byDay).map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));

  res.json({ total, wins, losses, winRate: parseFloat(winRate.toFixed(1)), totalPnl: parseFloat(totalPnl.toFixed(2)), grossProfit: parseFloat(grossProfit.toFixed(2)), grossLoss: parseFloat(grossLoss.toFixed(2)), profitFactor: parseFloat(profitFactor.toFixed(2)), avgWin: parseFloat(avgWin.toFixed(2)), avgLoss: parseFloat(avgLoss.toFixed(2)), avgRR: parseFloat(avgRR.toFixed(2)), maxDrawdown: parseFloat(maxDD.toFixed(2)), equityCurve, heatmap, bestTrade, worstTrade });
});

// Admin: class overview stats
router.get('/class', requireAdmin, (req: AuthRequest, res) => {
  const db = getDb();
  const students = db.prepare(`
    SELECT u.id, u.name,
      COUNT(tj.id) as total_trades,
      SUM(CASE WHEN tj.pnl > 0 AND tj.status='closed' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN tj.status='closed' THEN 1 ELSE 0 END) as closed_trades,
      ROUND(SUM(CASE WHEN tj.status='closed' THEN COALESCE(tj.pnl,0) ELSE 0 END), 2) as total_pnl,
      MAX(tj.date) as last_trade
    FROM users u
    LEFT JOIN trade_journals tj ON tj.student_id = u.id AND tj.type = 'idea'
    WHERE u.role = 'student' AND u.is_deleted = 0
    GROUP BY u.id
    ORDER BY total_pnl DESC
  `).all() as any[];

  const classTotal = students.reduce((s, u) => s + (u.closed_trades || 0), 0);
  const classWins = students.reduce((s, u) => s + (u.wins || 0), 0);
  const classPnl = students.reduce((s, u) => s + (u.total_pnl || 0), 0);

  res.json({
    students: students.map(s => ({
      ...s,
      win_rate: s.closed_trades ? parseFloat(((s.wins / s.closed_trades) * 100).toFixed(1)) : 0,
    })),
    summary: {
      total_students: students.length,
      total_trades: classTotal,
      class_win_rate: classTotal ? parseFloat(((classWins / classTotal) * 100).toFixed(1)) : 0,
      class_pnl: parseFloat(classPnl.toFixed(2)),
    },
  });
});

export default router;
