/**
 * Journal Ideas — "Design like this" glass coal UI
 * Matches design spec: 6-col card grid, backdrop-filter glass, inset top sheen
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { TrendingUp, Share2 } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, selectStyle, Btn } from '../../components/Modal';
import MultiImageUpload from '../../components/MultiImageUpload';
import TradeDetailPanel from '../../components/TradeDetailPanel';
import { useFilters } from '../../hooks/useFilters';
import toast from 'react-hot-toast';
import { EMOTIONS, EmotionBall as EmotionBallPicker, EmotionChip } from '../../components/EmotionBall';

// ── Design tokens (from Journal Ideas.dc.html) ──────────────────────────────
const FONT = "'Inter', system-ui, sans-serif";
const GREEN  = '#5fd6a4';
const GDOT   = '#6ee0a8';
const GGLOW  = 'rgba(110,224,168,0.7)';
const RED    = '#ef8b78';
const RDOT   = '#ef7d6a';
const RGLOW  = 'rgba(239,125,106,0.7)';
const WHITE  = '#e9e9e9';
const BLUE   = '#60A5FA';

// Glass card base (from design)
const GLASS: React.CSSProperties = {
  background: 'rgba(20,21,23,0.42)',
  backdropFilter: 'blur(20px) saturate(125%)',
  WebkitBackdropFilter: 'blur(20px) saturate(125%)',
  border: '1px solid rgba(255,255,255,0.085)',
  borderRadius: 16,
  boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

// Emotion display helpers (used in TradeRow list view)
const emotionEmoji: Record<string, string> = {
  joy: '😊', calm: '😌', confident: '💪', sadness: '😢',
  anxiety: '😰', anger: '😤', fearful: '😨', greedy: '🤑', revenge: '🔥',
};
const emotionLabel: Record<string, string> = {
  joy: 'Joy', calm: 'Calm', confident: 'Confident', sadness: 'Sadness',
  anxiety: 'Anxiety', anger: 'Anger', fearful: 'Fear', greedy: 'Greed', revenge: 'Revenge',
};

const defaultForm = {
  date: '', symbol: '', direction: 'long',
  entry_price: '', exit_price: '', sl: '', tp: '',
  lot_size: '', pnl: '', rr_ratio: '', emotion: '',
  discipline_score: '', notes: '', status: 'open',
  screenshot_url: '', screenshots: [] as string[], account_id: '',
};

// ── Copy P&L card as PNG ───────────────────────────────────────────────────
async function copyPnlCard(trade: any) {
  const W = 720, H = 440;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const pnl = Number(trade.pnl ?? 0);
  const pos = pnl >= 0;
  const C = pos ? GREEN : RED;
  ctx.fillStyle = '#141414';
  ctx.beginPath(); ctx.roundRect(0, 0, W, H, 24); ctx.fill();
  const g = ctx.createRadialGradient(W * 0.72, H * 0.25, 0, W * 0.72, H * 0.25, 280);
  g.addColorStop(0, `${C}12`); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `${C}28`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(0.75, 0.75, W - 1.5, H - 1.5, 24); ctx.stroke();
  ctx.font = '700 9px Inter,sans-serif'; ctx.fillStyle = '#4B5563';
  ctx.letterSpacing = '3px'; ctx.fillText('TRADE P&L', 52, 60);
  ctx.font = '600 13px Inter,sans-serif'; ctx.fillStyle = '#64748B';
  ctx.fillText(`${trade.symbol || '—'}  ·  ${(trade.direction || '').toUpperCase()}`, 52, 84);
  const pnlStr = `${pos ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  ctx.save(); ctx.shadowColor = C; ctx.shadowBlur = 30;
  ctx.font = '900 72px Inter,sans-serif';
  ctx.fillStyle = '#F8FAFC'; ctx.textAlign = 'left';
  ctx.fillText(pnlStr, 52, 186); ctx.restore();
  ctx.font = '500 11px Inter,sans-serif'; ctx.fillStyle = '#4B5563';
  ctx.fillText(trade.date || '', 52, 218);

  // Draw decorative equity line
  const lx = 52, rx = W - 52;
  const lineY1 = pos ? 350 : 260; // start y
  const lineY2 = pos ? 265 : 350; // end y
  const lineColor = pos ? '#5fd6a4' : '#ef8b78';

  // Glow pass
  ctx.save();
  ctx.shadowColor = lineColor; ctx.shadowBlur = 12;
  ctx.strokeStyle = lineColor; ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lx, lineY1);
  ctx.bezierCurveTo(lx + (rx-lx)*0.35, lineY1, lx + (rx-lx)*0.55, lineY2 + (pos ? 20 : -20), rx, lineY2);
  ctx.stroke();
  ctx.restore();

  // Gradient fill under line
  const lineFill = ctx.createLinearGradient(0, Math.min(lineY1,lineY2), 0, 380);
  lineFill.addColorStop(0, pos ? 'rgba(95,214,164,0.18)' : 'rgba(239,139,120,0.18)');
  lineFill.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.moveTo(lx, lineY1);
  ctx.bezierCurveTo(lx + (rx-lx)*0.35, lineY1, lx + (rx-lx)*0.55, lineY2 + (pos ? 20 : -20), rx, lineY2);
  ctx.lineTo(rx, 400); ctx.lineTo(lx, 400); ctx.closePath();
  ctx.fillStyle = lineFill; ctx.fill();

  ctx.font = '700 10px Inter,sans-serif'; ctx.fillStyle = '#374151';
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillText('IxR', W - 48, H - 22);
  canvas.toBlob(async blob => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success('P&L card copied!');
    } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pnl-${trade.symbol}-${trade.date}.png`;
      a.click();
    }
  });
}

// ── Trade card — matches design: 118px, 6-col, glass, glowing dot ──────────
function TradeCard({ trade, onClick, onShare }: { trade: any; onClick: () => void; onShare: () => void }) {
  const [hov, setHov] = useState(false);
  const pnl   = Number(trade.pnl ?? 0);
  const hasPnl = trade.pnl != null;
  const pos   = pnl >= 0;

  const dotColor = !hasPnl ? BLUE   : pos ? GDOT  : RDOT;
  const dotGlow  = !hasPnl ? 'rgba(96,165,250,0.7)' : pos ? GGLOW : RGLOW;
  const valColor = !hasPnl ? WHITE  : pos ? GREEN : RED;

  const displayVal = hasPnl
    ? `${pos ? '+' : ''}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : (trade.symbol || '—');

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...GLASS,
        height: 118,
        padding: '14px 15px',
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.18s cubic-bezier(.16,1,.3,1)',
        transform: hov ? 'translateY(-2px)' : 'none',
        borderColor: hov ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.085)',
        boxShadow: hov
          ? '0 14px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Glowing status dot — top right */}
      <span style={{
        position: 'absolute', top: 13, right: 13,
        width: 9, height: 9, borderRadius: '50%',
        background: dotColor,
        boxShadow: `0 0 7px ${dotGlow}`,
      }} />

      {/* Large value */}
      <div style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em',
        color: valColor, marginTop: 14,
        textShadow: hasPnl ? `0 0 14px ${valColor}55` : 'none',
      }}>
        {displayVal}
      </div>

      {/* Bottom row: Setup/Emotion Tag + share on hover */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9.5, color: 'rgba(205,205,205,0.42)', whiteSpace: 'nowrap' }}>Setup/Emotion Tag:</span>
        {trade.emotion
          ? <EmotionChip emotionId={trade.emotion} />
          : <span style={{ padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', fontSize: 9.5, fontWeight: 600, color: 'rgba(225,225,225,0.72)' }}>No Emotion</span>
        }
        {hov && (
          <button
            onClick={e => { e.stopPropagation(); onShare(); }}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 4, padding: '2px 5px', color: 'rgba(220,220,220,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          ><Share2 size={8} /></button>
        )}
      </div>
    </div>
  );
}

// ── List row ─────────────────────────────────────────────────────────────────
function TradeRow({ trade, onClick }: { trade: any; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const pnl    = Number(trade.pnl ?? 0);
  const hasPnl = trade.pnl != null;
  const pos    = pnl >= 0;
  const dotCol = !hasPnl ? BLUE : pos ? GDOT : RDOT;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...GLASS,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px', cursor: 'pointer',
        transition: 'all 0.14s',
        borderColor: hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.085)',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotCol, boxShadow: `0 0 5px ${dotCol}99`, flexShrink: 0 }} />
      <div style={{ minWidth: 70, fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>{trade.symbol || '—'}</div>
      <div style={{ minWidth: 50, fontSize: 9, fontWeight: 700, color: trade.direction === 'long' ? GREEN : RED }}>
        {trade.direction === 'long' ? '↑ LONG' : '↓ SHORT'}
      </div>
      <div style={{ minWidth: 82, fontSize: 10, color: 'rgba(210,210,210,0.45)', fontFamily: 'ui-monospace,monospace' }}>{trade.date}</div>
      <div style={{ flex: 1, fontSize: 9.5, color: 'rgba(205,205,205,0.42)' }}>
        {trade.emotion ? `${emotionEmoji[trade.emotion] || ''} ${emotionLabel[trade.emotion] || trade.emotion}` : '—'}
      </div>
      <span style={{
        fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
        border: `1px solid ${trade.status === 'open' ? 'rgba(96,165,250,0.28)' : 'rgba(95,214,164,0.28)'}`,
        color: trade.status === 'open' ? BLUE : GREEN,
      }}>{trade.status === 'open' ? 'OPEN' : 'CLOSED'}</span>
      <div style={{ fontSize: 14, fontWeight: 800, color: hasPnl ? (pos ? GREEN : RED) : 'rgba(180,180,180,0.3)', letterSpacing: '-0.03em', minWidth: 90, textAlign: 'right' }}>
        {hasPnl ? `${pos ? '+' : ''}$${Math.abs(pnl).toFixed(2)}` : '—'}
      </div>
    </div>
  );
}

// ── Filter pill button ────────────────────────────────────────────────────────
function Pill({ active, color = '#f0f0f0', onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <span
      onClick={onClick}
      style={{
        padding: '6px 13px', borderRadius: 9, cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: active ? color : 'rgba(220,220,220,0.5)',
        fontSize: 12, fontWeight: 600,
        transition: 'all 0.13s',
        userSelect: 'none',
      }}
    >{children}</span>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function JournalIdea() {
  const qc = useQueryClient();
  const { filters, setFilters } = useFilters('journal-idea', { symbol: '', direction: '', status: '', account_id: '' });
  const [modal, setModal]     = useState<any>(null);
  const [form, setForm]       = useState(defaultForm);
  const [saving, setSaving]   = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts() });
  const { data: allTrades = [] } = useQuery({ queryKey: ['journals', 'idea-all'], queryFn: () => api.getJournals({ type: 'idea' }) });

  const params: Record<string, string> = { type: 'idea' };
  if (filters.symbol)     params.symbol     = filters.symbol;
  if (filters.direction)  params.direction  = filters.direction;
  if (filters.status)     params.status     = filters.status;
  if (filters.account_id) params.account_id = filters.account_id;

  const { data: trades = [] } = useQuery({ queryKey: ['journals', 'idea', filters], queryFn: () => api.getJournals(params) });

  const tradeList = Array.isArray(trades)    ? trades    as any[] : [];
  const allList   = Array.isArray(allTrades) ? allTrades as any[] : [];

  const longCount   = allList.filter((t: any) => t.direction === 'long').length;
  const shortCount  = allList.filter((t: any) => t.direction === 'short').length;
  const closedCount = allList.filter((t: any) => t.status === 'closed').length;

  const quickStats = useMemo(() => {
    const closed = allList.filter((t: any) => t.status === 'closed' && t.pnl != null);
    if (!closed.length) return null;
    const pnls   = closed.map((t: any) => Number(t.pnl));
    const wins   = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const gW = wins.reduce((a, b) => a + b, 0);
    const gL = Math.abs(losses.reduce((a, b) => a + b, 0));
    return {
      winRate: ((wins.length / closed.length) * 100).toFixed(0),
      pf:      gL ? (gW / gL).toFixed(1) : '∞',
      best:    Math.max(...pnls),
      worst:   Math.min(...pnls),
    };
  }, [allList]);

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const openNew  = () => { setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] }); setModal({}); };
  const openEdit = (t: any) => {
    const shots = Array.isArray(t.screenshots) ? t.screenshots : (t.screenshot_url ? [t.screenshot_url] : []);
    setForm({ date: t.date, symbol: t.symbol || '', direction: t.direction || 'long', entry_price: t.entry_price ?? '', exit_price: t.exit_price ?? '', sl: t.sl ?? '', tp: t.tp ?? '', lot_size: t.lot_size ?? '', pnl: t.pnl ?? '', rr_ratio: t.rr_ratio ?? '', emotion: t.emotion || '', discipline_score: t.discipline_score ?? '', notes: t.notes || '', status: t.status, screenshot_url: t.screenshot_url || '', screenshots: shots, account_id: t.account_id || '' });
    setSelected(null); setModal(t);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, type: 'idea', entry_price: form.entry_price || null, exit_price: form.exit_price || null, sl: form.sl || null, tp: form.tp || null, lot_size: form.lot_size || null, pnl: form.pnl || null, rr_ratio: form.rr_ratio || null, discipline_score: form.discipline_score || null, account_id: form.account_id || null, screenshot_url: form.screenshots[0] || form.screenshot_url || null };
      if (modal?.id) { await api.updateJournal(modal.id, data); toast.success('Updated'); }
      else { await api.createJournal(data); toast.success('Trade logged'); }
      qc.invalidateQueries({ queryKey: ['journals'] }); setModal(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };
  const toggleStatus = async (t: any) => {
    await api.updateJournal(t.id, { status: t.status === 'open' ? 'closed' : 'open' });
    qc.invalidateQueries({ queryKey: ['journals'] }); setSelected(null);
    toast.success('Updated');
  };

  const iconBtn = (active: boolean): React.CSSProperties => ({
    width: 32, height: 30, borderRadius: 9,
    background: active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: active ? '#e8e8e8' : 'rgba(220,220,220,0.5)',
    cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 13,
    transition: 'all 0.13s',
  });

  return (
    <div style={{ fontFamily: FONT }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(220,220,220,0.42)', textTransform: 'uppercase', marginBottom: 5 }}>TRADE JOURNAL</div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', color: '#f3f3f3' }}>Journal Ideas</h2>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            border: '1px solid rgba(255,255,255,0.13)', borderRadius: 14,
            background: 'rgba(28,29,31,0.6)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            color: '#ededed', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(40,41,43,0.75)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(28,29,31,0.6)'; }}
        >
          <span style={{ fontSize: 15, fontWeight: 400, lineHeight: 1 }}>+</span> New Trade
        </button>
      </div>

      {/* ── Filter row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        {/* Symbol dropdown */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, width: 140, padding: '9px 14px',
          border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12,
          background: 'rgba(24,25,27,0.55)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          fontSize: 12, color: 'rgba(225,225,225,0.65)',
          position: 'relative',
        }}>
          <select
            value={filters.symbol}
            onChange={e => setFilters({ symbol: e.target.value })}
            style={{
              position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%',
            }}
          >
            <option value="">Symbol Filter...</option>
          </select>
          <input
            value={filters.symbol}
            onChange={e => setFilters({ symbol: e.target.value })}
            placeholder="Symbol Filter..."
            style={{ background: 'none', border: 'none', outline: 'none', color: 'inherit', fontSize: 12, fontFamily: FONT, width: '100%' }}
          />
          <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}>▾</span>
        </div>

        {/* Direction + Status pill group */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: 5,
          border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12,
          background: 'rgba(24,25,27,0.55)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        }}>
          <Pill active={!filters.direction && !filters.status} onClick={() => setFilters({ direction: '', status: '' })}>ALL</Pill>
          {longCount > 0 && (
            <Pill active={filters.direction === 'long'} color={GREEN} onClick={() => setFilters({ direction: 'long' })}>
              {longCount} LONG
            </Pill>
          )}
          {shortCount > 0 && (
            <Pill active={filters.direction === 'short'} color={RED} onClick={() => setFilters({ direction: 'short' })}>
              {shortCount} SHORT
            </Pill>
          )}
          <Pill active={!filters.status} onClick={() => setFilters({ status: '' })}>ALL</Pill>
          {closedCount > 0 && (
            <Pill active={filters.status === 'closed'} onClick={() => setFilters({ status: 'closed' })}>
              CLOSED
            </Pill>
          )}
        </div>

        {/* Account filter */}
        <select
          value={filters.account_id}
          onChange={e => setFilters({ account_id: e.target.value })}
          style={{
            height: 36, padding: '0 12px',
            border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
            background: 'rgba(24,25,27,0.55)',
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            color: 'rgba(225,225,225,0.65)', fontSize: 12, fontFamily: FONT, outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All Accounts</option>
          {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* ── Quick Stats bar ── */}
      {quickStats && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 26, marginBottom: 14,
          padding: '12px 18px',
          border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14,
          background: 'rgba(22,23,25,0.5)',
          backdropFilter: 'blur(22px) saturate(130%)', WebkitBackdropFilter: 'blur(22px) saturate(130%)',
          boxShadow: '0 8px 26px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>Quick Stats</span>
          <span style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)' }}>
            Win Rate: <b style={{ color: Number(quickStats.winRate) >= 50 ? GREEN : RED }}>{quickStats.winRate}%</b>
          </span>
          <span style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)' }}>
            Profit Factor: <b style={{ color: '#e8e8e8' }}>{quickStats.pf}</b>
          </span>
          <span style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)' }}>
            Best Trade: <b style={{ color: GREEN }}>+${quickStats.best.toFixed(2)}</b>
          </span>
          <span style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)' }}>
            Worst Trade: <b style={{ color: RED }}>-${Math.abs(quickStats.worst).toFixed(2)}</b>
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => setViewMode('grid')} style={iconBtn(viewMode === 'grid')}>▦</button>
            <button onClick={() => setViewMode('list')} style={iconBtn(viewMode === 'list')}>☰</button>
          </div>
        </div>
      )}

      {/* ── Trade grid / list ── */}
      {tradeList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', ...GLASS, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <TrendingUp size={20} style={{ opacity: 0.15, color: '#f0f0f0' }} />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(210,210,210,0.45)', marginBottom: 4 }}>No trades yet</p>
          <p style={{ fontSize: 11, color: 'rgba(180,180,180,0.3)' }}>Click "New Trade" to log your first trade</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 13 }}>
          {tradeList.map((t: any) => (
            <TradeCard key={t.id} trade={t} onClick={() => setSelected(t)} onShare={() => copyPnlCard(t)} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 12, padding: '4px 16px', fontSize: 8.5, fontWeight: 700, color: 'rgba(180,180,180,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <div style={{ width: 8 }} /><div style={{ minWidth: 70 }}>Symbol</div>
            <div style={{ minWidth: 50 }}>Dir</div><div style={{ minWidth: 82 }}>Date</div>
            <div style={{ flex: 1 }}>Emotion</div><div>Status</div>
            <div style={{ minWidth: 90, textAlign: 'right' }}>P&L</div>
          </div>
          {tradeList.map((t: any) => <TradeRow key={t.id} trade={t} onClick={() => setSelected(t)} />)}
        </div>
      )}

      {selected && (
        <TradeDetailPanel
          trade={selected}
          onClose={() => setSelected(null)}
          onEdit={openEdit}
          onDelete={() => { qc.invalidateQueries({ queryKey: ['journals'] }); setSelected(null); }}
          onToggleStatus={toggleStatus}
        />
      )}

      {modal !== null && (
        <Modal title={modal?.id ? 'Edit Trade' : 'Log New Trade'} onClose={() => setModal(null)} width={640}>
          <form onSubmit={save}>
            <Field label="Prop Firm Account">
              <select value={form.account_id} onChange={f('account_id')} style={selectStyle}>
                <option value="">No account linked</option>
                {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Date"><input type="date" value={form.date} onChange={f('date')} required style={inputStyle} /></Field>
              <Field label="Symbol"><input value={form.symbol} onChange={f('symbol')} placeholder="NQ / XAUUSD" style={inputStyle} /></Field>
              <Field label="Direction">
                <select value={form.direction} onChange={f('direction')} style={selectStyle}>
                  <option value="long">Long</option><option value="short">Short</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <Field label="Entry"><input type="number" value={form.entry_price} onChange={f('entry_price')} step="any" style={inputStyle} /></Field>
              <Field label="Exit"><input type="number" value={form.exit_price} onChange={f('exit_price')} step="any" style={inputStyle} /></Field>
              <Field label="Stop Loss"><input type="number" value={form.sl} onChange={f('sl')} step="any" style={inputStyle} /></Field>
              <Field label="Take Profit"><input type="number" value={form.tp} onChange={f('tp')} step="any" style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Lot Size"><input type="number" value={form.lot_size} onChange={f('lot_size')} step="any" style={inputStyle} /></Field>
              <Field label="P&L ($)"><input type="number" value={form.pnl} onChange={f('pnl')} step="any" style={inputStyle} /></Field>
              <Field label="R:R Ratio"><input type="number" value={form.rr_ratio} onChange={f('rr_ratio')} step="any" style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Emotion">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, padding: '6px 0' }}>
                  <button type="button" onClick={() => setForm(p => ({ ...p, emotion: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '6px 4px', borderRadius: 10, outline: form.emotion === '' ? '2px solid #6b7280' : '2px solid transparent', outlineOffset: 2 }}>
                    <svg width={40} height={40} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6b728033" stroke="#6b728066" strokeWidth="1"/><text x="12" y="16" textAnchor="middle" fontSize="10" fill="#9ca3af">–</text></svg>
                    <span style={{ fontSize: 9, fontWeight: 600, color: form.emotion === '' ? '#9ca3af' : '#6b7280' }}>None</span>
                  </button>
                  {EMOTIONS.map(em => (
                    <EmotionBallPicker key={em.id} emotion={em} size={40} selected={form.emotion === em.id} onClick={() => setForm(p => ({ ...p, emotion: em.id }))} />
                  ))}
                </div>
              </Field>
              <Field label="Discipline (1–10)"><input type="number" value={form.discipline_score} onChange={f('discipline_score')} min={1} max={10} style={inputStyle} /></Field>
              <Field label="Status">
                <select value={form.status} onChange={f('status')} style={selectStyle}>
                  <option value="open">Open</option><option value="closed">Closed</option>
                </select>
              </Field>
            </div>
            <Field label="Chart screenshots (Ctrl+V or upload)">
              <MultiImageUpload images={form.screenshots} onChange={urls => setForm(p => ({ ...p, screenshots: urls }))} active={modal !== null} maxImages={10} />
            </Field>
            <Field label="Notes">
              <textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Setup, execution notes..." style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Trade'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
