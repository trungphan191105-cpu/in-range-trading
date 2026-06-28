import { X, Edit2, CheckCircle, Share2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { EmotionChip } from './EmotionBall';

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

const GREEN = '#5fd6a4';
const RED   = '#ef8b78';

export default function TradeDetailPanel({ trade, onClose, onEdit, onDelete, onToggleStatus, readOnly }: Props) {
  const [deleting, setDeleting] = useState(false);

  if (!trade) return null;

  const isLong = trade.direction === 'long';
  const pnlPos = (trade.pnl ?? 0) >= 0;

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

  const safeDate = (() => {
    try { return format(parseISO(trade.date), 'dd/MM/yyyy'); } catch { return trade.date || '—'; }
  })();

  const border: React.CSSProperties = { borderBottom: '1px solid rgba(255,255,255,0.07)' };

  const row = (label: string, val: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', ...border }}>
      <span style={{ color: 'rgba(205,205,205,0.5)', fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f3f3' }}>{val}</span>
    </div>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Overlay tint */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      {/* Panel — solid dark, NOT transparent */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 1,
        width: 420, height: '100vh',
        background: 'rgba(12,13,15,0.98)',
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        borderLeft: '1px solid rgba(255,255,255,0.09)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-24px 0 64px rgba(0,0,0,0.7)',
        overflowY: 'auto',
        animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(12,13,15,0.98)', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {trade.symbol && <span style={{ fontSize: 20, fontWeight: 800, color: '#f3f3f3', letterSpacing: '-0.03em' }}>{trade.symbol}</span>}
              {trade.direction && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                  color: isLong ? GREEN : RED,
                  background: isLong ? 'rgba(95,214,164,0.1)' : 'rgba(239,139,120,0.1)',
                  border: `1px solid ${isLong ? 'rgba(95,214,164,0.3)' : 'rgba(239,139,120,0.3)'}`,
                  padding: '2px 9px', borderRadius: 20,
                }}>
                  {isLong ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {isLong ? 'LONG' : 'SHORT'}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(205,205,205,0.42)', marginTop: 3 }}>{safeDate}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.085)', cursor: 'pointer', color: 'rgba(210,210,210,0.5)', padding: 6, borderRadius: 8, display: 'flex', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.color = '#f3f3f3'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.085)'; (e.currentTarget as HTMLElement).style.color = 'rgba(210,210,210,0.5)'; }}>
            <X size={15} />
          </button>
        </div>

        {/* PnL banner */}
        {trade.pnl !== null && trade.pnl !== undefined && (
          <div style={{ padding: '18px 22px', background: pnlPos ? 'rgba(95,214,164,0.07)' : 'rgba(239,139,120,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: pnlPos ? GREEN : RED, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)} USD
            </div>
            <div style={{ fontSize: 11, color: 'rgba(205,205,205,0.42)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              P&L · {trade.status === 'open' ? 'Đang mở' : 'Đã đóng'}
            </div>
          </div>
        )}

        {/* Screenshot */}
        {trade.screenshot_url && (
          <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <img src={trade.screenshot_url} alt="Chart" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.085)' }} />
          </div>
        )}

        {/* Details */}
        <div style={{ padding: '0 22px', flex: 1 }}>
          {trade.entry_price != null && row('Entry', `$${trade.entry_price}`)}
          {trade.exit_price  != null && row('Exit',  `$${trade.exit_price}`)}
          {trade.sl          != null && row('Stop Loss',    <span style={{ color: RED }}>${trade.sl}</span>)}
          {trade.tp          != null && row('Take Profit',  <span style={{ color: GREEN }}>${trade.tp}</span>)}
          {trade.lot_size    != null && row('Lot Size', trade.lot_size)}
          {trade.rr_ratio    != null && row('R:R Ratio', <span style={{ color: '#60A5FA' }}>1:{trade.rr_ratio}</span>)}
          {trade.emotion     && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', ...border }}>
              <span style={{ color: 'rgba(205,205,205,0.5)', fontSize: 12 }}>Cảm xúc</span>
              <EmotionChip emotionId={trade.emotion} />
            </div>
          )}
          {trade.discipline_score != null && row('Discipline', `${trade.discipline_score}/10`)}
          {trade.notes && (
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Ghi chú</div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(230,230,230,0.8)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 13px', borderRadius: 10 }}>{trade.notes}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!readOnly && (
          <div style={{ padding: '16px 22px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: 'rgba(12,13,15,0.98)' }}>
            {onEdit && (
              <button onClick={() => onEdit(trade)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f3f3f3', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                <Edit2 size={13} /> Sửa
              </button>
            )}
            {onToggleStatus && (
              <button onClick={() => onToggleStatus(trade)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(95,214,164,0.25)', background: 'rgba(95,214,164,0.07)', color: GREEN, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                <CheckCircle size={13} /> {trade.status === 'open' ? 'Đóng' : 'Mở lại'}
              </button>
            )}
            <button onClick={handleShare} style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(210,210,210,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Share2 size={13} />
            </button>
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(239,139,120,0.25)', background: 'rgba(239,139,120,0.07)', color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
