/**
 * Spend & Payout Tracker — track challenge fees, subscriptions, and prop firm payouts
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Pencil, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, selectStyle, Btn } from '../../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const SPEND_CATS = [
  { value: 'challenge_fee', label: 'Challenge Fee' },
  { value: 'subscription', label: 'Subscription / Tool' },
  { value: 'education', label: 'Education / Course' },
  { value: 'data_feed', label: 'Data Feed / News' },
  { value: 'other_spend', label: 'Other Expense' },
];
const PAYOUT_CATS = [
  { value: 'prop_payout', label: 'Prop Firm Payout' },
  { value: 'live_profit', label: 'Live Account Profit' },
  { value: 'rebate', label: 'Rebate / Cashback' },
  { value: 'other_payout', label: 'Other Income' },
];

const DEFAULT_FORM = { date: format(new Date(), 'yyyy-MM-dd'), type: 'spend', category: 'challenge_fee', amount: '', account_id: '', notes: '' };

function fmt$(v: number) {
  return `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SpendPayout() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'spend' | 'payout'>('all');

  const { data: entries = [] } = useQuery({ queryKey: ['spend'], queryFn: () => api.getSpend() });
  const { data: summary } = useQuery({ queryKey: ['spend-summary'], queryFn: () => api.getSpendSummary() });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts() });

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const openNew = (type = 'spend') => {
    setForm({ ...DEFAULT_FORM, type, category: type === 'spend' ? 'challenge_fee' : 'prop_payout' });
    setModal({});
  };
  const openEdit = (e: any) => {
    setForm({ date: e.date, type: e.type, category: e.category, amount: e.amount, account_id: e.account_id || '', notes: e.notes || '' });
    setModal(e);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      if (modal?.id) { await api.updateSpend(modal.id, form); toast.success('Updated'); }
      else { await api.createSpend(form); toast.success('Added'); }
      qc.invalidateQueries({ queryKey: ['spend'] });
      qc.invalidateQueries({ queryKey: ['spend-summary'] });
      setModal(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await api.deleteSpend(id);
    qc.invalidateQueries({ queryKey: ['spend'] });
    qc.invalidateQueries({ queryKey: ['spend-summary'] });
    toast.success('Deleted');
  };

  const s = summary as any;
  const all = entries as any[];
  const filtered = filter === 'all' ? all : all.filter((e: any) => e.type === filter);

  const card: React.CSSProperties = {
    background: 'rgba(19,19,19,0.65)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '18px 20px',
    position: 'relative',
    overflow: 'hidden',
  };

  const cats = form.type === 'spend' ? SPEND_CATS : PAYOUT_CATS;

  return (
    <div className="font-avenir" style={{ position: 'relative' }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '15%', right: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,190,150,0.04) 0%, transparent 65%)', animation: 'orbDrift 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,116,106,0.035) 0%, transparent 65%)', animation: 'orbDrift 25s ease-in-out infinite reverse' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em' }}>Spend & Payout</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>Theo dõi chi phí và lợi nhuận rút ra</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => openNew('payout')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(78,190,150,0.4)', background: 'rgba(78,190,150,0.08)', color: 'var(--green)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <ArrowUpRight size={14} /> Add Payout
            </button>
            <button onClick={() => openNew('spend')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(200,116,106,0.4)', background: 'rgba(200,116,106,0.08)', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <ArrowDownLeft size={14} /> Add Spend
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'TOTAL PAYOUT', value: s?.payout || 0, icon: <TrendingUp size={16} />, color: 'var(--green)', pos: true },
            { label: 'TOTAL SPEND', value: s?.spend || 0, icon: <TrendingDown size={16} />, color: 'var(--red)', pos: false },
            { label: 'NET PROFIT', value: s?.net || 0, icon: <DollarSign size={16} />, color: (s?.net || 0) >= 0 ? 'var(--green)' : 'var(--red)', pos: (s?.net || 0) >= 0 },
          ].map(k => (
            <div key={k.label} style={{ ...card }}>
              <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${k.color}44, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ color: k.color, opacity: 0.6 }}>{k.icon}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.05em', color: k.color, textShadow: `0 0 20px ${k.color}33` }}>
                {k.pos && k.value > 0 ? '+' : k.value < 0 ? '-' : ''}{fmt$(k.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
          {(['all', 'payout', 'spend'] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: '5px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: filter === t ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: filter === t ? 'var(--text)' : 'var(--text-muted)',
              textTransform: 'capitalize',
            }}>{t === 'all' ? 'All' : t === 'payout' ? 'Payouts' : 'Spends'}</button>
          ))}
        </div>

        {/* Entry list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <DollarSign size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>No entries yet</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Track your challenge fees and prop firm payouts</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((e: any) => {
              const isSpend = e.type === 'spend';
              const cat = [...SPEND_CATS, ...PAYOUT_CATS].find(c => c.value === e.category)?.label || e.category;
              return (
                <div key={e.id} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isSpend ? 'rgba(200,116,106,0.1)' : 'rgba(78,190,150,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSpend ? <ArrowDownLeft size={16} color="var(--red)" /> : <ArrowUpRight size={16} color="var(--green)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{cat}</span>
                      {e.account_name && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {e.account_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.date}{e.notes ? ` · ${e.notes}` : ''}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: isSpend ? 'var(--red)' : 'var(--green)', letterSpacing: '-0.03em', textShadow: `0 0 12px ${isSpend ? 'rgba(200,116,106,0.3)' : 'rgba(78,190,150,0.3)'}` }}>
                    {isSpend ? '-' : '+'}{fmt$(e.amount)}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(e)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => del(e.id)} style={{ background: 'rgba(200,116,106,0.08)', border: '1px solid rgba(200,116,106,0.2)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--red)', display: 'flex' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {modal !== null && (
          <Modal title={modal?.id ? 'Edit Entry' : form.type === 'spend' ? 'Add Expense' : 'Add Payout'} onClose={() => setModal(null)} width={460}>
            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Date">
                  <input type="date" value={form.date} onChange={f('date')} required style={inputStyle} />
                </Field>
                <Field label="Type">
                  <select value={form.type} onChange={e => { const t = e.target.value; setForm(p => ({ ...p, type: t, category: t === 'spend' ? 'challenge_fee' : 'prop_payout' })); }} style={selectStyle}>
                    <option value="spend">Expense / Spend</option>
                    <option value="payout">Payout / Income</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Category">
                  <select value={form.category} onChange={f('category')} style={selectStyle}>
                    {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Amount ($)">
                  <input type="number" value={form.amount} onChange={f('amount')} required min="0" step="0.01" placeholder="0.00" style={inputStyle} />
                </Field>
              </div>
              <Field label="Account (optional)">
                <select value={form.account_id} onChange={f('account_id')} style={selectStyle}>
                  <option value="">— No account —</option>
                  {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Notes (optional)">
                <input value={form.notes} onChange={f('notes')} placeholder="FTMO 100K challenge..." style={inputStyle} />
              </Field>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <Btn disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
