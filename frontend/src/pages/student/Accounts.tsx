import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, AlertTriangle, Pencil, Trash2, ImagePlus } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, selectStyle, Btn } from '../../components/Modal';
import toast from 'react-hot-toast';

const PHASES = ['challenge', 'verification', 'funded', 'scaling', 'phase1', 'phase2', 'phase3', 'eod', 'intraday'];
const PHASE_LABEL: Record<string, string> = {
  challenge: 'Challenge', verification: 'Verification', funded: 'Funded', scaling: 'Scaling',
  phase1: 'Phase 1', phase2: 'Phase 2', phase3: 'Phase 3',
  eod: 'EOD', intraday: 'Intraday',
};
const PHASE_COLOR: Record<string, string> = {
  challenge: '#f5b142', verification: '#38bdf8', funded: '#10d98a', scaling: '#818cf8',
  phase1: '#f5b142', phase2: '#fb923c', phase3: '#f0506e',
  eod: '#a78bfa', intraday: '#34d399',
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

const PRESET_COLORS = ['#10d98a', '#38bdf8', '#f5b142', '#818cf8', '#f0506e', '#fb923c', '#a78bfa', '#34d399'];

const DEFAULT_FORM = { name: '', prop_firm: '', account_type: 'prop', phase: 'challenge', currency: 'USD', initial_balance: '', max_daily_loss_pct: '5', max_total_drawdown_pct: '10', profit_target_pct: '', color: '#38bdf8', logo_url: '', start_date: '' };

export default function Accounts({ studentId }: { studentId?: string }) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const params: Record<string, string> = studentId ? { studentId } : {};
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
      if (modal?.id) { await api.updateAccount(modal.id, form); toast.success('Đã cập nhật account'); }
      else { await api.createAccount(form); toast.success('Đã thêm account'); }
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setModal(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Xóa account "${name}"?`)) return;
    await api.deleteAccount(id);
    qc.invalidateQueries({ queryKey: ['accounts'] });
    toast.success('Đã xóa');
  };

  const accs = accounts as any[];
  const totalPnl = accs.reduce((s, a) => s + (a.realized_pnl || 0), 0);
  const totalBalance = accs.reduce((s, a) => s + (a.current_balance || 0), 0);

  return (
    <div className="font-avenir">
      {!studentId && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em' }}>Prop Firm Accounts</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Quản lý tất cả tài khoản prop firm của bạn</p>
          </div>
          <Btn onClick={openNew}><Plus size={14} />Thêm Account</Btn>
        </div>
      )}

      {/* Summary row */}
      {accs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'TỔNG ACCOUNTS', value: accs.length, color: 'var(--text)' },
            { label: 'TỔNG BALANCE', value: `$${totalBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'var(--text)' },
            { label: 'TỔNG REALIZED P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent)' }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: '-0.04em' }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Account cards grid */}
      {accs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <Wallet size={52} style={{ opacity: 0.15, marginBottom: 16 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>Chưa có account nào</p>
          <p style={{ fontSize: 13, marginTop: 6, marginBottom: 20 }}>Thêm prop firm account đầu tiên</p>
          {!studentId && <Btn onClick={openNew}><Plus size={14} />Thêm Account</Btn>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {accs.map((a: any) => {
            const pnlPct = ((a.realized_pnl || 0) / a.initial_balance * 100);
            const ddPct = a.current_balance < a.initial_balance
              ? ((a.initial_balance - a.current_balance) / a.initial_balance * 100) : 0;
            const ddWarning = ddPct >= a.max_total_drawdown_pct * 0.7;
            const profitPct = a.profit_target_pct ? (pnlPct / a.profit_target_pct * 100) : null;

            return (
              <div key={a.id} style={{
                background: 'var(--card)', borderRadius: 16, overflow: 'hidden',
                border: `1px solid ${ddWarning ? 'rgba(240,80,110,0.3)' : 'var(--border)'}`,
                boxShadow: ddWarning ? '0 0 20px rgba(240,80,110,0.08)' : 'none',
                transition: 'border-color 0.2s',
              }}>
                {/* Color bar + header */}
                <div style={{ height: 3, background: a.color || '#38bdf8' }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {a.logo_url && <img src={a.logo_url} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'contain', background: 'var(--surface2)', border: '1px solid var(--border)', padding: 3, flexShrink: 0 }} />}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, boxShadow: `0 0 6px ${a.color}` }} />
                          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>{a.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {a.prop_firm && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{a.prop_firm}</span>}
                          {a.account_type && a.account_type !== 'prop' && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid rgba(167,139,250,0.2)' }}>
                              {ACCOUNT_TYPES.find(t => t.value === a.account_type)?.label.split('—')[1]?.trim() || a.account_type}
                            </span>
                          )}
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: (PHASE_COLOR[a.phase] || '#868f97') + '18', color: PHASE_COLOR[a.phase] || '#868f97', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PHASE_LABEL[a.phase] || a.phase}</span>
                        </div>
                      </div>
                    </div>
                    {!studentId && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openEdit(a)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => del(a.id, a.name)} style={{ background: 'var(--red-dim)', border: '1px solid rgba(240,80,110,0.2)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: 'var(--red)', display: 'flex' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Balance */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Current Balance</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>
                      ${a.current_balance?.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>{a.currency}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Start: ${Number(a.initial_balance).toLocaleString('en')}
                    </div>
                  </div>

                  {/* P&L */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Realized P&L</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: (a.realized_pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {(a.realized_pnl || 0) >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {(a.realized_pnl || 0) >= 0 ? '+' : ''}${Math.abs(a.realized_pnl || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: (a.realized_pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)', opacity: 0.7, marginTop: 2 }}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Trades</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>{a.total_trades || 0}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.open_trades || 0} đang mở</div>
                    </div>
                  </div>

                  {/* Drawdown bar */}
                  <div style={{ marginBottom: ddWarning ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Drawdown</span>
                      <span style={{ color: ddWarning ? 'var(--red)' : 'var(--text-muted)' }}>
                        {ddPct.toFixed(2)}% / {a.max_total_drawdown_pct}%
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((ddPct / a.max_total_drawdown_pct) * 100, 100)}%`, background: ddWarning ? 'var(--red)' : 'var(--green)', borderRadius: 99, transition: 'width 0.6s' }} />
                    </div>
                  </div>

                  {/* Profit target bar */}
                  {profitPct !== null && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Profit Target</span>
                        <span style={{ color: 'var(--accent)' }}>{pnlPct.toFixed(2)}% / {a.profit_target_pct}%</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(Math.max(profitPct, 0), 100)}%`, background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', borderRadius: 99, transition: 'width 0.6s' }} />
                      </div>
                    </div>
                  )}

                  {/* Warning */}
                  {ddWarning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 10px', background: 'rgba(240,80,110,0.08)', borderRadius: 8, border: '1px solid rgba(240,80,110,0.2)' }}>
                      <AlertTriangle size={12} color="var(--red)" />
                      <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>Gần đạt giới hạn drawdown — Cẩn thận!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <Modal title={modal?.id ? 'Sửa Account' : 'Thêm Account'} onClose={() => setModal(null)} width={600}>
          <form onSubmit={save}>
            {/* Account type grid */}
            <Field label="Loại tài khoản">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {ACCOUNT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => {
                    const defaultPhase = t.phases[0];
                    setForm(p => ({ ...p, account_type: t.value, phase: defaultPhase }));
                  }} style={{
                    padding: '7px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.3,
                    border: `1px solid ${form.account_type === t.value ? 'rgba(71,159,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: form.account_type === t.value ? 'rgba(71,159,250,0.1)' : 'rgba(255,255,255,0.02)',
                    color: form.account_type === t.value ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}>{t.label}</button>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Tên account">
                <input value={form.name} onChange={f('name')} required placeholder="FTMO #1 — 100K" style={inputStyle} />
              </Field>
              <Field label="Broker / Firm">
                <input value={form.prop_firm} onChange={f('prop_firm')} placeholder="FTMO, MyFundedFX, E8, Apex..." style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <Field label="Phase / Stage">
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
              <Field label="Balance ($)">
                <input type="number" value={form.initial_balance} onChange={f('initial_balance')} required placeholder="100000" style={inputStyle} />
              </Field>
              <Field label="Start date">
                <input type="date" value={form.start_date} onChange={f('start_date')} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Max daily loss (%)">
                <input type="number" value={form.max_daily_loss_pct} onChange={f('max_daily_loss_pct')} step="0.1" style={inputStyle} />
              </Field>
              <Field label="Max drawdown (%)">
                <input type="number" value={form.max_total_drawdown_pct} onChange={f('max_total_drawdown_pct')} step="0.1" style={inputStyle} />
              </Field>
              <Field label="Profit target (%)">
                <input type="number" value={form.profit_target_pct} onChange={f('profit_target_pct')} step="0.1" placeholder="8" style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Màu nhận diện">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: form.color === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer', outline: form.color === c ? `2px solid ${c}` : 'none', transition: 'all 0.15s' }} />
                  ))}
                  <input type="color" value={form.color} onChange={f('color')} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'none' }} />
                </div>
              </Field>
              <Field label="Logo Prop Firm">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {form.logo_url && <img src={form.logo_url} alt="logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: 'var(--surface3)' }} />}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'var(--surface3)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    <ImagePlus size={14} /> {form.logo_url ? 'Đổi logo' : 'Upload logo'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      try { const url = await api.uploadScreenshot(file); setForm(p => ({ ...p, logo_url: url })); } catch {}
                    }} />
                  </label>
                  {form.logo_url && <button type="button" onClick={() => setForm(p => ({ ...p, logo_url: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}>Xóa</button>}
                </div>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Hủy</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Đang lưu...' : modal?.id ? 'Cập nhật' : 'Thêm Account'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
