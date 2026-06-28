/**
 * Prop Firm Accounts — Glass Coal Design
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, AlertTriangle, Pencil, Trash2, ImagePlus } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, selectStyle, Btn } from '../../components/Modal';
import toast from 'react-hot-toast';

const PHASES = ['challenge', 'verification', 'funded', 'scaling', 'phase1', 'phase2', 'phase3', 'eod', 'intraday'];
const PHASE_LABEL: Record<string, string> = {
  challenge: 'Challenge', verification: 'Verification', funded: 'Funded', scaling: 'Scaling',
  phase1: 'Phase 1', phase2: 'Phase 2', phase3: 'Phase 3', eod: 'EOD', intraday: 'Intraday',
};
const PHASE_COLOR: Record<string, string> = {
  challenge: '#FBBF24', verification: '#60A5FA', funded: '#5fd6a4', scaling: '#A78BFA',
  phase1: '#FBBF24', phase2: '#FB923C', phase3: '#ef8b78',
  eod: '#A78BFA', intraday: '#34D399',
};

const ACCOUNT_TYPES = [
  { value: 'prop', label: 'Prop Firm', phases: ['challenge', 'verification', 'funded', 'scaling'] },
  { value: 'cfd_instant', label: 'CFD — Instant Funding', phases: ['funded'] },
  { value: 'cfd_1phase', label: 'CFD — 1 Phase', phases: ['phase1', 'funded'] },
  { value: 'cfd_2phase', label: 'CFD — 2 Phase', phases: ['phase1', 'phase2', 'funded'] },
  { value: 'cfd_3phase', label: 'CFD — 3 Phase', phases: ['phase1', 'phase2', 'phase3', 'funded'] },
  { value: 'futures_eod', label: 'Futures — EOD Reset', phases: ['eod', 'funded'] },
  { value: 'futures_intraday', label: 'Futures — Intraday', phases: ['intraday', 'funded'] },
  { value: 'live', label: 'Live Account', phases: ['funded'] },
];

const PRESET_COLORS = ['#5fd6a4', '#60A5FA', '#FBBF24', '#A78BFA', '#ef8b78', '#FB923C', '#34D399', '#F472B6'];
const DEFAULT_FORM = { name: '', prop_firm: '', account_type: 'prop', phase: 'challenge', currency: 'USD', initial_balance: '', max_daily_loss_pct: '5', max_total_drawdown_pct: '10', profit_target_pct: '', color: '#60A5FA', logo_url: '', start_date: '' };

const MINT = '#5fd6a4';
const ROSE = '#ef8b78';
const AMBER = '#FBBF24';

// ── Account card — glass coal ────────────────────────────────────────────────
function AccountCard({ a, studentId, onEdit, onDelete }: { a: any; studentId?: string; onEdit: () => void; onDelete: () => void }) {
  const [hov, setHov] = useState(false);
  const pnl = a.realized_pnl || 0;
  const pnlPct = a.initial_balance ? (pnl / a.initial_balance * 100) : 0;
  const ddPct = a.current_balance < a.initial_balance
    ? ((a.initial_balance - a.current_balance) / a.initial_balance * 100) : 0;
  const ddWarning = ddPct >= a.max_total_drawdown_pct * 0.7;
  const profitPct = a.profit_target_pct ? (pnlPct / a.profit_target_pct * 100) : null;
  const accentColor = a.color || '#60A5FA';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(22,23,25,0.55)' : 'rgba(20,21,23,0.42)',
        backdropFilter: 'blur(20px) saturate(125%)',
        WebkitBackdropFilter: 'blur(20px) saturate(125%)',
        border: `1px solid ${ddWarning ? 'rgba(239,139,120,0.25)' : hov ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.085)'}`,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: ddWarning
          ? '0 0 18px rgba(239,139,120,0.08), 0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          : hov
          ? '0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)'
          : '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        transition: 'all 0.2s cubic-bezier(.16,1,.3,1)',
        transform: hov ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Colored top bar */}
      <div style={{ height: 2.5, background: accentColor, opacity: 0.85 }} />

      <div style={{ padding: '15px 16px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            {a.logo_url && (
              <img src={a.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'contain', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: 3, flexShrink: 0 }} />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, boxShadow: `0 0 7px ${accentColor}`, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#f3f3f3', letterSpacing: '-0.025em' }}>{a.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {a.prop_firm && <span style={{ fontSize: 10, color: 'rgba(180,180,180,0.3)', fontWeight: 600 }}>{a.prop_firm}</span>}
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                  background: `${PHASE_COLOR[a.phase] || '#64748B'}15`,
                  border: `1px solid ${PHASE_COLOR[a.phase] || '#64748B'}35`,
                  color: PHASE_COLOR[a.phase] || '#64748B',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {PHASE_LABEL[a.phase] || a.phase}
                </span>
              </div>
            </div>
          </div>

          {!studentId && (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={onEdit} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '4px 7px', cursor: 'pointer', color: 'rgba(210,210,210,0.5)', display: 'flex', transition: 'all 0.13s' }}>
                <Pencil size={11} />
              </button>
              <button onClick={onDelete} style={{ background: 'rgba(239,139,120,0.07)', border: '1px solid rgba(239,139,120,0.18)', borderRadius: 7, padding: '4px 7px', cursor: 'pointer', color: ROSE, display: 'flex', transition: 'all 0.13s' }}>
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Balance */}
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.11em', marginBottom: 4 }}>CURRENT BALANCE</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#f3f3f3', letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            ${a.current_balance?.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: 11, color: 'rgba(180,180,180,0.3)', fontWeight: 500, marginLeft: 5 }}>{a.currency}</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(180,180,180,0.3)', marginTop: 3 }}>Start: ${Number(a.initial_balance).toLocaleString('en')}</div>
        </div>

        {/* P&L + Trades split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 13 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '9px 11px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 8.5, color: 'rgba(205,205,205,0.42)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
              {pnl >= 0 ? <TrendingUp size={9} color={MINT} /> : <TrendingDown size={9} color={ROSE} />}
              REALIZED P&L
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: pnl >= 0 ? MINT : ROSE, letterSpacing: '-0.03em' }}>
              {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
            </div>
            <div style={{ fontSize: 9, color: pnl >= 0 ? MINT : ROSE, opacity: 0.65, marginTop: 2 }}>
              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '9px 11px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 8.5, color: 'rgba(205,205,205,0.42)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>TRADES</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#f3f3f3', letterSpacing: '-0.03em' }}>{a.total_trades || 0}</div>
            <div style={{ fontSize: 9, color: 'rgba(180,180,180,0.3)', marginTop: 2 }}>{a.open_trades || 0} đang mở</div>
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {/* Drawdown */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DRAWDOWN</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: ddWarning ? ROSE : 'rgba(210,210,210,0.5)' }}>
                {ddPct.toFixed(2)}% / {a.max_total_drawdown_pct}%
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((ddPct / a.max_total_drawdown_pct) * 100, 100)}%`, background: ddWarning ? ROSE : MINT, borderRadius: 99, transition: 'width 0.6s cubic-bezier(.16,1,.3,1)' }} />
            </div>
          </div>

          {/* Profit target */}
          {profitPct !== null && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PROFIT TARGET</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#60A5FA' }}>
                  {pnlPct.toFixed(2)}% / {a.profit_target_pct}%
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(Math.max(profitPct, 0), 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #60A5FA)', borderRadius: 99, transition: 'width 0.6s cubic-bezier(.16,1,.3,1)' }} />
              </div>
            </div>
          )}

          {/* Warning banner */}
          {ddWarning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'rgba(239,139,120,0.07)', borderRadius: 8, border: '1px solid rgba(239,139,120,0.18)' }}>
              <AlertTriangle size={11} color={ROSE} />
              <span style={{ fontSize: 10, color: ROSE, fontWeight: 600 }}>Approaching drawdown limit — trade carefully</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function Accounts({ studentId }: { studentId?: string }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [logoPasting, setLogoPasting] = useState(false);

  useEffect(() => {
    if (!modal) return;
    const onPaste = async (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
      if (!item) return;
      e.preventDefault();
      setLogoPasting(true);
      try {
        const file = item.getAsFile();
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: fd });
        const data = await res.json();
        if (data.url) setForm(p => ({ ...p, logo_url: data.url }));
        toast.success('Logo pasted!');
      } catch { toast.error('Failed to paste logo'); }
      finally { setLogoPasting(false); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [modal]);

  const params = studentId ? { studentId } : {};
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts', studentId], queryFn: () => api.getAccounts(params) });

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const openNew = () => { setForm(DEFAULT_FORM); setModal({}); };
  const openEdit = (a: any) => {
    setForm({ name: a.name, prop_firm: a.prop_firm || '', account_type: a.account_type || 'prop', phase: a.phase, currency: a.currency, initial_balance: a.initial_balance, max_daily_loss_pct: a.max_daily_loss_pct, max_total_drawdown_pct: a.max_total_drawdown_pct, profit_target_pct: a.profit_target_pct || '', color: a.color, logo_url: a.logo_url || '', start_date: a.start_date || '' });
    setModal(a);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) { await api.updateAccount(modal.id, form); toast.success('Account updated'); }
      else { await api.createAccount(form); toast.success('Account added'); }
      qc.invalidateQueries({ queryKey: ['accounts'] }); setModal(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };
  const del = async (id: string, name: string) => {
    if (!confirm(`Delete account "${name}"?`)) return;
    await api.deleteAccount(id);
    qc.invalidateQueries({ queryKey: ['accounts'] });
    toast.success('Deleted');
  };

  const accs = accounts as any[];
  const totalPnl = accs.reduce((s, a) => s + (a.realized_pnl || 0), 0);
  const totalBalance = accs.reduce((s, a) => s + (a.current_balance || 0), 0);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      {!studentId && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(220,220,220,0.42)', textTransform: 'uppercase', marginBottom: 6 }}>PROP FIRM</div>
            <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', color: '#f3f3f3' }}>Prop Firm Accounts</h2>
            <p style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)', marginTop: 3 }}>Quản lý tất cả tài khoản prop firm của bạn</p>
          </div>
          <button onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.13)', background: 'rgba(28,29,31,0.6)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', color: '#f3f3f3', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(38,39,41,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(28,29,31,0.6)'; }}>
            <Plus size={12} /> Add Account
          </button>
        </div>
      )}

      {/* Summary KPI cards */}
      {accs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'TỔNG ACCOUNTS', value: String(accs.length), color: '#f3f3f3', accent: '#60A5FA' },
            { label: 'TỔNG BALANCE', value: `$${totalBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#f3f3f3', accent: '#A78BFA' },
            { label: 'TỔNG REALIZED P&L', value: `${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toFixed(2)}`, color: totalPnl >= 0 ? MINT : ROSE, accent: totalPnl >= 0 ? MINT : ROSE },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(20,21,23,0.42)', backdropFilter: 'blur(20px) saturate(125%)', WebkitBackdropFilter: 'blur(20px) saturate(125%)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 16, padding: '14px 18px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${k.accent}44, transparent)` }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: k.color, letterSpacing: '-0.05em' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Account cards */}
      {accs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 0', color: 'rgba(210,210,210,0.5)' }}>
          <Wallet size={48} style={{ opacity: 0.10, marginBottom: 14 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(210,210,210,0.5)', marginBottom: 6 }}>No accounts yet</p>
          <p style={{ fontSize: 12, marginBottom: 18 }}>Add your first prop firm account</p>
          {!studentId && (
            <button onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.13)', background: 'rgba(28,29,31,0.6)', color: '#f3f3f3', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={13} /> Add Account
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {accs.map((a: any) => (
            <AccountCard key={a.id} a={a} studentId={studentId} onEdit={() => openEdit(a)} onDelete={() => del(a.id, a.name)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <Modal title={modal?.id ? 'Edit Account' : 'Add Account'} onClose={() => setModal(null)} width={600}>
          <form onSubmit={save}>
            <Field label="Account Type">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {ACCOUNT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setForm(p => ({ ...p, account_type: t.value, phase: t.phases[0] }))}
                    style={{ padding: '7px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.3, border: `1px solid ${form.account_type === t.value ? 'rgba(95,214,164,0.4)' : 'rgba(255,255,255,0.07)'}`, background: form.account_type === t.value ? 'rgba(95,214,164,0.1)' : 'rgba(255,255,255,0.02)', color: form.account_type === t.value ? '#5fd6a4' : 'rgba(210,210,210,0.5)', transition: 'all 0.13s' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Account name"><input value={form.name} onChange={f('name')} required placeholder="FTMO #1 — 100K" style={inputStyle} /></Field>
              <Field label="Broker / Firm"><input value={form.prop_firm} onChange={f('prop_firm')} placeholder="FTMO, MyFundedFX, Apex..." style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <Field label="Phase">
                <select value={form.phase} onChange={f('phase')} style={selectStyle}>
                  {(ACCOUNT_TYPES.find(t => t.value === form.account_type)?.phases || PHASES).map(p => (
                    <option key={p} value={p}>{PHASE_LABEL[p] || p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Currency">
                <select value={form.currency} onChange={f('currency')} style={selectStyle}>
                  <option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option>
                </select>
              </Field>
              <Field label="Balance ($)"><input type="number" value={form.initial_balance} onChange={f('initial_balance')} required placeholder="100000" style={inputStyle} /></Field>
              <Field label="Start date"><input type="date" value={form.start_date} onChange={f('start_date')} style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Max daily loss (%)"><input type="number" value={form.max_daily_loss_pct} onChange={f('max_daily_loss_pct')} step="0.1" style={inputStyle} /></Field>
              <Field label="Max drawdown (%)"><input type="number" value={form.max_total_drawdown_pct} onChange={f('max_total_drawdown_pct')} step="0.1" style={inputStyle} /></Field>
              <Field label="Profit target (%)"><input type="number" value={form.profit_target_pct} onChange={f('profit_target_pct')} step="0.1" placeholder="8" style={inputStyle} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Color">
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none', transition: 'all 0.13s' }} />
                  ))}
                  <input type="color" value={form.color} onChange={f('color')} style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'none' }} />
                </div>
              </Field>
              <Field label="Prop Firm Logo">
                <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  {form.logo_url && <img src={form.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 7, objectFit: 'contain', background: 'rgba(255,255,255,0.04)' }} />}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 11, color: 'rgba(210,210,210,0.5)', fontWeight: 600 }}>
                    <ImagePlus size={13} /> {form.logo_url ? 'Change logo' : 'Upload logo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      try { const url = await api.uploadScreenshot(file); setForm(p => ({ ...p, logo_url: url })); } catch {}
                    }} />
                  </label>
                  {form.logo_url && <button type="button" onClick={() => setForm(p => ({ ...p, logo_url: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(210,210,210,0.5)', fontSize: 11 }}>Remove</button>}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(205,205,205,0.35)', marginTop: 4 }}>
                  {logoPasting ? '⏳ Đang upload...' : '💡 Ctrl+V để dán ảnh logo từ clipboard'}
                </div>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : modal?.id ? 'Update Account' : 'Add Account'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
