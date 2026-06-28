/**
 * Spend & Payout Tracker — Glass Coal Design
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

const DEFAULT_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'spend', category: 'challenge_fee',
  amount: '', account_id: '', notes: '',
};

const MINT = '#5fd6a4';
const ROSE = '#ef8b78';

function fmt$(v: number) {
  return `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CARD: React.CSSProperties = {
  background: 'rgba(20,21,23,0.42)',
  backdropFilter: 'blur(20px) saturate(125%)',
  WebkitBackdropFilter: 'blur(20px) saturate(125%)',
  border: '1px solid rgba(255,255,255,0.085)',
  borderRadius: 16,
  boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

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
  const cats = form.type === 'spend' ? SPEND_CATS : PAYOUT_CATS;

  const pill = (active: boolean, col = '#f3f3f3'): React.CSSProperties => ({
    padding: '5px 14px', borderRadius: 7, fontSize: 11, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s', border: 'none',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: active ? col : 'rgba(180,180,180,0.3)',
    outline: active ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.04)',
  });

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(220,220,220,0.42)', textTransform: 'uppercase', marginBottom: 6 }}>FINANCE</div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', color: '#f3f3f3' }}>Spend & Payout</h2>
          <p style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)', marginTop: 3 }}>Theo dõi chi phí và lợi nhuận rút ra</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openNew('payout')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 14, border: `1px solid rgba(95,214,164,0.3)`, background: `rgba(95,214,164,0.08)`, backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', color: MINT, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(95,214,164,0.14)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `rgba(95,214,164,0.08)`; }}>
            <ArrowUpRight size={13} /> Add Payout
          </button>
          <button onClick={() => openNew('spend')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 14, border: `1px solid rgba(239,139,120,0.3)`, background: `rgba(239,139,120,0.08)`, backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', color: ROSE, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(239,139,120,0.14)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `rgba(239,139,120,0.08)`; }}>
            <ArrowDownLeft size={13} /> Add Spend
          </button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'TOTAL PAYOUT', val: s?.payout || 0, icon: <TrendingUp size={15} />, color: MINT, sign: '+' },
          { label: 'TOTAL SPEND', val: s?.spend || 0, icon: <TrendingDown size={15} />, color: ROSE, sign: '-' },
          { label: 'NET PROFIT', val: s?.net || 0, icon: <DollarSign size={15} />, color: (s?.net || 0) >= 0 ? MINT : ROSE, sign: (s?.net || 0) >= 0 ? '+' : '' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${k.color}44, transparent)` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ color: k.color, opacity: 0.5 }}>{k.icon}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.05em', color: k.color }}>
              {k.val !== 0 ? k.sign : ''}{fmt$(k.val)}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(20,21,23,0.42)', backdropFilter: 'blur(20px) saturate(125%)', WebkitBackdropFilter: 'blur(20px) saturate(125%)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
        {(['all', 'payout', 'spend'] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)} style={pill(filter === t, t === 'payout' ? MINT : t === 'spend' ? ROSE : '#f3f3f3')}>
            {t === 'all' ? 'All' : t === 'payout' ? 'Payouts' : 'Spends'}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'rgba(210,210,210,0.5)' }}>
          <DollarSign size={44} style={{ opacity: 0.08, marginBottom: 14 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(210,210,210,0.5)', marginBottom: 4 }}>No entries yet</p>
          <p style={{ fontSize: 11 }}>Track your challenge fees and prop firm payouts</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((e: any) => {
            const isSpend = e.type === 'spend';
            const col = isSpend ? ROSE : MINT;
            const cat = [...SPEND_CATS, ...PAYOUT_CATS].find(c => c.value === e.category)?.label || e.category;
            return (
              <div key={e.id} style={{ ...CARD, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}
                onMouseEnter={el => { (el.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={el => { (el.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.085)'; }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${col}12`, border: `1px solid ${col}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isSpend ? <ArrowDownLeft size={14} color={ROSE} /> : <ArrowUpRight size={14} color={MINT} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f3f3f3' }}>{cat}</span>
                    {e.account_name && (
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(210,210,210,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        {e.account_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(205,205,205,0.42)' }}>{e.date}{e.notes ? ` · ${e.notes}` : ''}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: col, letterSpacing: '-0.03em', textShadow: `0 0 10px ${col}33` }}>
                  {isSpend ? '-' : '+'}{fmt$(e.amount)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(e)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'rgba(210,210,210,0.5)', display: 'flex', transition: 'all 0.13s' }}>
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => del(e.id)} style={{ background: `rgba(239,139,120,0.08)`, border: `1px solid rgba(239,139,120,0.2)`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: ROSE, display: 'flex', transition: 'all 0.13s' }}>
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
              <Field label="Date"><input type="date" value={form.date} onChange={f('date')} required style={inputStyle} /></Field>
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
              <Field label="Amount ($)"><input type="number" value={form.amount} onChange={f('amount')} required min="0" step="0.01" placeholder="0.00" style={inputStyle} /></Field>
            </div>
            <Field label="Account (optional)">
              <select value={form.account_id} onChange={f('account_id')} style={selectStyle}>
                <option value="">— No account —</option>
                {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Notes (optional)"><input value={form.notes} onChange={f('notes')} placeholder="FTMO 100K challenge..." style={inputStyle} /></Field>
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
