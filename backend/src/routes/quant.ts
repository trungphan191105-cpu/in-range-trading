import { Router } from 'express';
import { getDb } from '../db/schema';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// Returns all closed idea trades for a student, grouped by symbol with counts
router.get('/symbols', (req: any, res) => {
  const db = getDb();
  const uid = req.user.id;
  const rows = db.prepare(`
    SELECT symbol, COUNT(*) as count
    FROM trade_journals
    WHERE student_id=? AND type='idea' AND status='closed' AND pnl IS NOT NULL AND symbol IS NOT NULL
    GROUP BY symbol ORDER BY count DESC
  `).all(uid);
  res.json(rows);
});

// Returns all trades for a specific symbol (for quant calculations)
router.get('/trades/:symbol', (req: any, res) => {
  const db = getDb();
  const uid = req.user.id;
  const trades = db.prepare(`
    SELECT date, direction, entry_price, exit_price, sl, tp, lot_size, pnl,
           rr_ratio, discipline_score
    FROM trade_journals
    WHERE student_id=? AND type='idea' AND status='closed'
      AND pnl IS NOT NULL AND symbol=?
    ORDER BY date ASC, created_at ASC
  `).all(uid, req.params.symbol);
  res.json(trades);
});

export default router;
