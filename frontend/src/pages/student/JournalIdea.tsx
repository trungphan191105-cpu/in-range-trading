/**
 * Journal Idea — Gallery layout (like TradePlan)
 * Cards with screenshot · PnL · Share-as-image action
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, Share2, X, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, selectStyle, Btn } from '../../components/Modal';
import MultiImageUpload from '../../components/MultiImageUpload';
import TradeDetailPanel from '../../components/TradeDetailPanel';
import { useFilters } from '../../hooks/useFilters';
import toast from 'react-hot-toast';

const API_BASE = 'http://localhost:3001';
const emotions = ['calm','confident','happy','fearful','greedy','revenge'];
const emotionLabel: Record<string,string> = { calm:'😌 Bình tĩnh', confident:'💪 Tự tin', happy:'😊 Vui vẻ', fearful:'😨 Sợ hãi', greedy:'🤑 Tham lam', revenge:'😤 Revenge' };

const defaultForm = { date: '', symbol: '', direction: 'long', entry_price: '', exit_price: '', sl: '', tp: '', lot_size: '', pnl: '', rr_ratio: '', emotion: '', discipline_score: '', notes: '', status: 'open', screenshot_url: '', screenshots: [] as string[], account_id: '' };

// ── Ghost chip direction badge (Fey: outlined, no fill) ──────────────────
function DirectionBadge({ dir }: { dir: string }) {
  const long = dir === 'long';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 9, fontWeight: 700, padding: '2px 7px',
      borderRadius: 6, letterSpacing: '0.08em',
      border: `1px solid ${long ? 'rgba(78,190,150,0.5)' : 'rgba(200,116,106,0.5)'}`,
      color: long ? '#4ebe96' : '#c8746a',
      background: 'transparent',
    }}>
      {long ? <TrendingUp size={8} /> : <TrendingDown size={8} />} {dir.toUpperCase()}
    </span>
  );
}

// ── Share PnL card via canvas ───────────────────────────────────────────────
async function copyPnlCard(trade: any): Promise<void> {
  const W = 720, H = 440;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const pnl = Number(trade.pnl ?? 0);
  const pos = pnl >= 0;
  const pnlColor = pos ? '#4ebe96' : '#c8746a';

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0d0d1a');
  bgGrad.addColorStop(1, '#13131f');
  ctx.fillStyle = bgGrad;
  roundRect(ctx, 0, 0, W, H, 28); ctx.fill();

  // Glass border
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 28); ctx.stroke();

  // Subtle glow
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.22, 0, W * 0.72, H * 0.22, 260);
  glow.addColorStop(0, pos ? 'rgba(16,217,138,0.08)' : 'rgba(240,80,110,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // Stars (decorative)
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  [[490,55,1.4],[560,38,1],[610,70,0.7],[540,90,1.1],[650,42,0.9],[580,110,0.6],[470,30,0.8]].forEach(([x,y,r]) => {
    ctx.beginPath(); ctx.arc(x as number, y as number, r as number, 0, Math.PI*2); ctx.fill();
  });

  // Label
  ctx.font = '700 12px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.letterSpacing = '3px';
  ctx.fillText('TRADE P&L', 52, 66);

  // Symbol + direction
  ctx.font = '600 15px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(`${trade.symbol || '—'}  ·  ${(trade.direction || '').toUpperCase()}`, 52, 92);

  // Outer glow border (green profit / red loss)
  ctx.save();
  ctx.shadowColor = pos ? 'rgba(78,190,150,0.6)' : 'rgba(200,116,106,0.6)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = pos ? 'rgba(78,190,150,0.55)' : 'rgba(200,116,106,0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, W - 2, H - 2, 28); ctx.stroke();
  ctx.restore();

  // Wait for Open Sauce One font to be ready then draw
  await document.fonts.ready;

  // Big PnL number — NEON bold white with color glow
  const pnlStr = `${pos ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  ctx.save();
  ctx.shadowColor = pnlColor;
  ctx.shadowBlur = 32;
  ctx.font = `900 78px "Open Sauce One", "Montserrat", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '-3px';
  ctx.fillText(pnlStr, 52, 196);
  // Second pass for extra neon glow
  ctx.shadowBlur = 60;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(pnlStr, 52, 196);
  ctx.restore();

  // Date line
  ctx.font = `500 13px "Open Sauce One", Montserrat, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.textAlign = 'left';
  ctx.fillText(trade.date || '', 52, 230);

  // Symbol · direction label
  if (trade.symbol) {
    ctx.font = `600 12px "Open Sauce One", Montserrat, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillText(`${trade.symbol}  ·  ${(trade.direction || '').toUpperCase()}`, 52, 252);
  }

  // Decorative sparkline — UP for profit, DOWN for loss
  const chartPtsProfit: [number,number][] = [[52,390],[120,370],[200,358],[280,330],[360,318],[440,290],[530,268],[640,225],[700,198]];
  const chartPtsLoss: [number,number][] = [[52,198],[120,225],[200,268],[280,300],[360,320],[440,345],[530,368],[640,385],[700,398]];
  const chartPts = pos ? chartPtsProfit : chartPtsLoss;
  const lineY1 = pos ? 198 : 390;
  const lineY2 = pos ? 390 : 198;

  // Area fill
  ctx.save();
  const areaGrad = ctx.createLinearGradient(0, Math.min(lineY1, lineY2), 0, Math.max(lineY1, lineY2));
  areaGrad.addColorStop(0, pos ? 'rgba(78,190,150,0.22)' : 'rgba(200,116,106,0.22)');
  areaGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.moveTo(chartPts[0][0], chartPts[0][1]);
  chartPts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(700, H - 32); ctx.lineTo(52, H - 32); ctx.closePath();
  ctx.fillStyle = areaGrad; ctx.fill();
  ctx.restore();

  // Line stroke with neon glow
  ctx.save();
  ctx.shadowColor = pnlColor; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(chartPts[0][0], chartPts[0][1]);
  chartPts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.strokeStyle = pnlColor; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();

  // End dot
  const lastPt = chartPts[chartPts.length - 1];
  ctx.beginPath(); ctx.arc(lastPt[0], lastPt[1], 5, 0, Math.PI * 2);
  ctx.fillStyle = pnlColor; ctx.fill();

  // Bottom brand: "In Range We Play × Rels"
  ctx.font = `600 12px "Open Sauce One", Montserrat, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.textAlign = 'left';
  ctx.fillText('In Range We Play', 52, H - 22);
  ctx.font = `italic 600 12px "Open Sauce One", Montserrat, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillText('× Rels', 52 + ctx.measureText('In Range We Play  ').width, H - 22);

  // Bottom right — "I × R" mark
  ctx.font = `800 12px "Open Sauce One", Montserrat, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.textAlign = 'right';
  ctx.fillText('I × R', W - 52, H - 22);

  // Copy to clipboard
  canvas.toBlob(async (blob) => {
    if (!blob) { toast.error('Failed to render card'); return; }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.success('PnL card copied to clipboard!');
    } catch {
      // Fallback: download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pnl-${trade.symbol || 'trade'}-${trade.date}.png`;
      a.click();
    }
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Trade card ──────────────────────────────────────────────────────────────
function TradeCard({ trade, onClick, onShare }: { trade: any; onClick: () => void; onShare: () => void }) {
  const [hov, setHov] = useState(false);
  const pnl = Number(trade.pnl ?? 0);
  const pos = pnl >= 0;
  const hasImg = !!trade.screenshot_url;
  const imgUrl = hasImg ? (trade.screenshot_url.startsWith('http') ? trade.screenshot_url : `${API_BASE}${trade.screenshot_url}`) : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        background: 'rgba(19,19,19,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: hov
          ? '0 20px 56px rgba(0,0,0,0.6), 0 0 0 1px rgba(71,159,250,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
        transform: hov ? 'translateY(-3px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
      }}
    >
      {/* Image / placeholder */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: pos ? 'rgba(16,217,138,0.06)' : 'rgba(240,80,110,0.06)' }}>
        {imgUrl ? (
          <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)', transform: hov ? 'scale(1.03)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, padding: 20 }}>
            {/* Subtle radial glow accent */}
            <div style={{ position: 'absolute', inset: 0, background: pos ? 'radial-gradient(circle at 70% 30%, rgba(78,190,150,0.07), transparent 70%)' : 'radial-gradient(circle at 70% 30%, rgba(200,116,106,0.07), transparent 70%)' }} />
            <div style={{ fontSize: 32, fontWeight: 700, color: pos ? '#4ebe96' : '#c8746a', letterSpacing: '-0.053em', textShadow: `0 0 24px ${pos ? 'rgba(78,190,150,0.3)' : 'rgba(200,116,106,0.3)'}` }}>
              {pnl !== 0 ? `${pos ? '+' : ''}$${Math.abs(pnl).toFixed(2)}` : '—'}
            </div>
            <div style={{ fontSize: 10, color: '#868f97', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {trade.symbol || '—'}
            </div>
          </div>
        )}

        {/* Hover overlay */}
        {hov && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <button onClick={e => { e.stopPropagation(); onShare(); }} style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              backdropFilter: 'blur(8px)',
            }}>
              <Share2 size={12} /> Share P&L
            </button>
          </div>
        )}

        {/* Status ghost chip */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.08em', border: `1px solid ${trade.status === 'open' ? 'rgba(71,159,250,0.4)' : 'rgba(78,190,150,0.4)'}`, color: trade.status === 'open' ? '#479ffa' : '#4ebe96', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            {trade.status === 'open' ? 'OPEN' : 'CLOSED'}
          </span>
        </div>

        {/* PnL overlay when has image */}
        {imgUrl && (
          <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.7)', color: pos ? '#4ebe96' : '#c8746a', backdropFilter: 'blur(8px)', letterSpacing: '-0.03em', textShadow: `0 0 12px ${pos ? 'rgba(78,190,150,0.4)' : 'rgba(200,116,106,0.4)'}` }}>
              {pos ? '+' : ''}${Math.abs(pnl).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Card metadata */}
      <div style={{ padding: '10px 13px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#cccccc', letterSpacing: '-0.02em' }}>
            {trade.symbol || '—'}
          </span>
          {trade.direction && <DirectionBadge dir={trade.direction} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#868f97', letterSpacing: '0.05em' }}>{trade.date}</span>
          {trade.rr_ratio && <span style={{ fontSize: 10, color: '#479ffa', letterSpacing: '0.02em' }}>1:{trade.rr_ratio}</span>}
        </div>
        {/* Thin accent bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, background: pos ? '#4ebe96' : '#c8746a', opacity: 0.45, borderRadius: '0 0 12px 12px' }} />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function JournalIdea() {
  const qc = useQueryClient();
  const { filters, setFilters } = useFilters('journal-idea', { symbol: '', direction: '', status: '', account_id: '' });
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts() });

  const params: Record<string,string> = { type: 'idea' };
  if (filters.symbol) params.symbol = filters.symbol;
  if (filters.direction) params.direction = filters.direction;
  if (filters.status) params.status = filters.status;
  if (filters.account_id) params.account_id = filters.account_id;

  const { data: trades = [] } = useQuery({ queryKey: ['journals', 'idea', filters], queryFn: () => api.getJournals(params) });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const openNew = () => { setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] }); setModal({}); };
  const openEdit = (t: any) => {
    const shots = Array.isArray(t.screenshots) ? t.screenshots : (t.screenshot_url ? [t.screenshot_url] : []);
    setForm({ date: t.date, symbol: t.symbol||'', direction: t.direction||'long', entry_price: t.entry_price??'', exit_price: t.exit_price??'', sl: t.sl??'', tp: t.tp??'', lot_size: t.lot_size??'', pnl: t.pnl??'', rr_ratio: t.rr_ratio??'', emotion: t.emotion||'', discipline_score: t.discipline_score??'', notes: t.notes||'', status: t.status, screenshot_url: t.screenshot_url||'', screenshots: shots, account_id: t.account_id||'' });
    setSelected(null); setModal(t);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, type: 'idea', entry_price: form.entry_price||null, exit_price: form.exit_price||null, sl: form.sl||null, tp: form.tp||null, lot_size: form.lot_size||null, pnl: form.pnl||null, rr_ratio: form.rr_ratio||null, discipline_score: form.discipline_score||null, account_id: form.account_id||null, screenshot_url: form.screenshots[0]||form.screenshot_url||null };
      if (modal?.id) { await api.updateJournal(modal.id, data); toast.success('Đã cập nhật'); }
      else { await api.createJournal(data); toast.success('Đã thêm trade'); }
      qc.invalidateQueries({ queryKey: ['journals'] }); setModal(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (t: any) => {
    await api.updateJournal(t.id, { status: t.status === 'open' ? 'closed' : 'open' });
    qc.invalidateQueries({ queryKey: ['journals'] }); setSelected(null);
    toast.success('Đã cập nhật');
  };

  const tradeList = Array.isArray(trades) ? trades : [];
  const filterPills = [
    { value: '', label: 'All' },
    { value: 'long', label: '↑ LONG', field: 'direction' },
    { value: 'short', label: '↓ SHORT', field: 'direction' },
    { value: 'open', label: '● Open', field: 'status' },
    { value: 'closed', label: '✓ Closed', field: 'status' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#479ffa', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>Trade Journal</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Inter Tight', Inter, system-ui, sans-serif", color: '#e6e6e6', letterSpacing: '-0.053em' }}>Journal Ideas</h2>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#e6e6e6', border: '1px solid #e6e6e6', borderRadius: 99, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <Plus size={13} /> New Trade
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={filters.symbol} onChange={e => setFilters({ symbol: e.target.value })} placeholder="Symbol..." style={{ ...inputStyle, width: 120, height: 32 }} />
        {/* Direction ghost pills */}
        {(['','long','short'] as const).map(v => {
          const active = filters.direction === v;
          const color = v === 'long' ? '#4ebe96' : v === 'short' ? '#c8746a' : '#cccccc';
          return (
            <button key={v} onClick={() => setFilters({ direction: v })} style={{
              padding: '4px 11px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em',
              background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: active ? color : '#868f97',
              border: `1px solid ${active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}>
              {v === '' ? 'ALL' : v === 'long' ? '↑ LONG' : '↓ SHORT'}
            </button>
          );
        })}
        {(['','open','closed'] as const).map(v => {
          const active = filters.status === v;
          return (
            <button key={v} onClick={() => setFilters({ status: v })} style={{
              padding: '4px 11px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.06em',
              background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: active ? '#e6e6e6' : '#868f97',
              border: `1px solid ${active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}>
              {v === '' ? 'ALL STATUS' : v === 'open' ? '● OPEN' : '✓ CLOSED'}
            </button>
          );
        })}
        <select value={filters.account_id} onChange={e => setFilters({ account_id: e.target.value })} style={{ ...selectStyle, height: 32, fontSize: 11 }}>
          <option value="">All Accounts</option>
          {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Gallery grid */}
      {tradeList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          No trades yet. Add your first trade.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {tradeList.map((t: any) => (
            <TradeCard
              key={t.id}
              trade={t}
              onClick={() => setSelected(t)}
              onShare={() => copyPnlCard(t)}
            />
          ))}
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

      {/* Edit/Create modal */}
      {modal !== null && (
        <Modal title={modal?.id ? 'Sửa Trade' : 'Thêm Trade'} onClose={() => setModal(null)} width={640}>
          <form onSubmit={save}>
            <Field label="Prop Firm Account">
              <select value={form.account_id} onChange={f('account_id')} style={selectStyle}>
                <option value="">Không gắn account</option>
                {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="Ngày"><input type="date" value={form.date} onChange={f('date')} required style={inputStyle} /></Field>
              <Field label="Symbol"><input value={form.symbol} onChange={f('symbol')} placeholder="XAUUSD" style={inputStyle} /></Field>
              <Field label="Hướng"><select value={form.direction} onChange={f('direction')} style={selectStyle}><option value="long">Long</option><option value="short">Short</option></select></Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12 }}>
              <Field label="Entry"><input type="number" value={form.entry_price} onChange={f('entry_price')} placeholder="1920.00" step="any" style={inputStyle} /></Field>
              <Field label="Exit"><input type="number" value={form.exit_price} onChange={f('exit_price')} placeholder="1940.00" step="any" style={inputStyle} /></Field>
              <Field label="Stop Loss"><input type="number" value={form.sl} onChange={f('sl')} placeholder="1910.00" step="any" style={inputStyle} /></Field>
              <Field label="Take Profit"><input type="number" value={form.tp} onChange={f('tp')} placeholder="1960.00" step="any" style={inputStyle} /></Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="Lot Size"><input type="number" value={form.lot_size} onChange={f('lot_size')} placeholder="0.10" step="any" style={inputStyle} /></Field>
              <Field label="PnL ($)"><input type="number" value={form.pnl} onChange={f('pnl')} placeholder="150.00" step="any" style={inputStyle} /></Field>
              <Field label="R:R Ratio"><input type="number" value={form.rr_ratio} onChange={f('rr_ratio')} placeholder="2.5" step="any" style={inputStyle} /></Field>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="Cảm xúc"><select value={form.emotion} onChange={f('emotion')} style={selectStyle}><option value="">—</option>{emotions.map(e => <option key={e} value={e}>{emotionLabel[e]}</option>)}</select></Field>
              <Field label="Discipline (1-10)"><input type="number" value={form.discipline_score} onChange={f('discipline_score')} min={1} max={10} placeholder="8" style={inputStyle} /></Field>
              <Field label="Status"><select value={form.status} onChange={f('status')} style={selectStyle}><option value="open">Đang mở</option><option value="closed">Đã đóng</option></select></Field>
            </div>
            <Field label="Ảnh chart (nhiều ảnh, Ctrl+V hoặc upload)">
              <MultiImageUpload images={form.screenshots} onChange={urls => setForm(p => ({ ...p, screenshots: urls }))} active={modal !== null} maxImages={10} />
            </Field>
            <Field label="Ghi chú"><textarea value={form.notes} onChange={f('notes')} rows={3} placeholder="Nhận xét về trade..." style={{ ...inputStyle, resize:'vertical' }} /></Field>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Hủy</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
