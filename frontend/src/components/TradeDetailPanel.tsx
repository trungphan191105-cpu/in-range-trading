import { X, Edit2, CheckCircle, Share2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface Trade {
  id: string; date: string; symbol?: string; direction?: string;
  entry_price?: number; exit_price?: number; sl?: number; tp?: number;
  lot_size?: number; pnl?: number; rr_ratio?: number; screenshot_url?: string;
  emotion?: string; discipline_score?: number; notes?: string;
  type: string; status: string;
}

interface Props {
  trade: Trade | null;
  onClose: () => void;
  onEdit?: (trade: Trade) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (trade: Trade) => void;
  readOnly?: boolean;
}

const emotionEmoji: Record<string, string> = {
  calm: '😌 Bình tĩnh', confident: '💪 Tự tin', fearful: '😨 Sợ hãi',
  greedy: '🤑 Tham lam', revenge: '😤 Revenge', happy: '😊 Vui vẻ',
};

export default function TradeDetailPanel({ trade, onClose, onEdit, onDelete, onToggleStatus, readOnly }: Props) {
  const [deleting, setDeleting] = useState(false);

  if (!trade) return null;

  const isLong = trade.direction === 'long';
  const pnlColor = (trade.pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)';

  const handleDelete = async () => {
    if (!confirm('Xóa trade này?')) return;
    setDeleting(true);
    try {
      await api.deleteJournal(trade.id);
      toast.success('Đã xóa');
      onDelete?.(trade.id);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href + `?trade=${trade.id}`);
    toast.success('Đã copy link');
  };

  const row = (label: string, val: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{val}</span>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 420, height: '100vh', background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {trade.symbol && <span style={{ fontSize: 20, fontWeight: 700 }}>{trade.symbol}</span>}
              {trade.direction && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                  color: isLong ? 'var(--green)' : 'var(--red)',
                  background: isLong ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  {isLong ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {isLong ? 'LONG' : 'SHORT'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {format(parseISO(trade.date), 'dd/MM/yyyy')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* PnL banner */}
        {trade.pnl !== null && trade.pnl !== undefined && (
          <div style={{ padding: '16px 20px', background: (trade.pnl >= 0) ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: pnlColor }}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              P&L {trade.status === 'open' ? '(Đang mở)' : '(Đã đóng)'}
            </div>
          </div>
        )}

        {/* Screenshot */}
        {trade.screenshot_url && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <img src={trade.screenshot_url} alt="Chart" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          </div>
        )}

        {/* Details */}
        <div style={{ padding: '0 20px' }}>
          {trade.entry_price !== null && trade.entry_price !== undefined && row('Entry', trade.entry_price)}
          {trade.exit_price !== null && trade.exit_price !== undefined && row('Exit', trade.exit_price)}
          {trade.sl !== null && trade.sl !== undefined && row('Stop Loss', <span style={{ color: 'var(--red)' }}>{trade.sl}</span>)}
          {trade.tp !== null && trade.tp !== undefined && row('Take Profit', <span style={{ color: 'var(--green)' }}>{trade.tp}</span>)}
          {trade.lot_size !== null && trade.lot_size !== undefined && row('Lot Size', trade.lot_size)}
          {trade.rr_ratio !== null && trade.rr_ratio !== undefined && row('R:R Ratio', <span style={{ color: 'var(--accent)' }}>1:{trade.rr_ratio}</span>)}
          {trade.emotion && row('Cảm xúc', emotionEmoji[trade.emotion] || trade.emotion)}
          {trade.discipline_score !== null && trade.discipline_score !== undefined && row('Discipline', `${trade.discipline_score}/10`)}
          {trade.notes && (
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Ghi chú</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', background: 'var(--surface2)', padding: '10px 12px', borderRadius: 8 }}>{trade.notes}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!readOnly && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, marginTop: 'auto', position: 'sticky', bottom: 0, background: 'var(--surface)' }}>
            {onEdit && (
              <button onClick={() => onEdit(trade)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
                <Edit2 size={14} /> Sửa
              </button>
            )}
            {onToggleStatus && (
              <button onClick={() => onToggleStatus(trade)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
                <CheckCircle size={14} /> {trade.status === 'open' ? 'Đóng' : 'Mở lại'}
              </button>
            )}
            <button onClick={handleShare} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer' }}>
              <Share2 size={14} />
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
