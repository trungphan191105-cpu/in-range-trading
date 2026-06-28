/**
 * Trade Plans — Carbon Design System v2
 * Glass pill filters · Open Sans · Deep card design
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, selectStyle, Btn } from '../../components/Modal';
import MultiImageUpload from '../../components/MultiImageUpload';
import toast from 'react-hot-toast';

const MINT  = '#4ADE80';
const ROSE  = '#FB7185';
const AMBER = '#FBBF24';
const BLUE  = '#60A5FA';

const GRADE_COLOR: Record<string, string> = { A: MINT, B: BLUE, C: AMBER, D: ROSE };
const BIAS_COLOR: Record<string, string>  = { bullish: MINT, bearish: ROSE, neutral: AMBER };
const BIAS_LABEL: Record<string, string>  = { bullish: '↑ Bullish', bearish: '↓ Bearish', neutral: '⇄ Neutral' };
const STATUS_COLOR: Record<string, string> = { draft: '#475569', published: BLUE, reviewed: MINT };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', published: 'Published', reviewed: 'Reviewed' };

const defaultForm = { date: '', title: '', market_bias: '', content: '', status: 'draft', screenshots: [] as string[] };

const FONT = "'Space Grotesk', 'Inter', system-ui, sans-serif";
const GLASS: React.CSSProperties = {
  background: 'rgba(20,21,23,0.42)',
  backdropFilter: 'blur(20px) saturate(125%)',
  WebkitBackdropFilter: 'blur(20px) saturate(125%)',
  border: '1px solid rgba(255,255,255,0.085)',
  boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

/* ── Glass pill button ── */
function GlassPill({ active, color = '#F8FAFC', onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        padding: '8px 20px', borderRadius: 99,
        fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        cursor: 'pointer', border: 'none', outline: 'none',
        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
        background: active
          ? 'rgba(255,255,255,0.08)'
          : hov ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderStyle: 'solid',
        borderColor: active ? 'rgba(255,255,255,0.18)' : hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)',
        color: active ? color : hov ? '#64748B' : '#374151',
        boxShadow: active
          ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px rgba(255,255,255,0.05), 0 4px 14px rgba(0,0,0,0.5)'
          : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.3)',
        textShadow: active ? `0 0 10px ${color}66` : 'none',
      }}
    >
      {/* gloss top highlight */}
      <span style={{ position: 'absolute', top: 0, left: '8%', right: '8%', height: '44%', background: 'linear-gradient(180deg,rgba(255,255,255,0.07),transparent)', borderRadius: '99px 99px 0 0', pointerEvents: 'none' }} />
      {children}
    </button>
  );
}

// ── Plan Viewer (lightbox) ────────────────────────────────────────────────────
function PlanViewer({ plan, onClose, onEdit, onDelete }: { plan: any; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const shots: string[] = Array.isArray(plan.screenshots) ? plan.screenshots : (plan.screenshot_url ? [plan.screenshot_url] : []);
  const [imgIdx, setImgIdx] = useState(0);
  const bias = plan.market_bias as string;
  const grade = plan.grade as string;
  const status = plan.status as string;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'stretch' }} onClick={onClose}>

      {/* Image panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '60px 32px' }} onClick={e => e.stopPropagation()}>
        {shots.length > 0 ? (
          <>
            <img src={shots[imgIdx]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }} />
            {shots.length > 1 && (
              <>
                <button onClick={() => setImgIdx(i => (i - 1 + shots.length) % shots.length)} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(28,28,28,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#F8FAFC', backdropFilter: 'blur(8px)' }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setImgIdx(i => (i + 1) % shots.length)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(28,28,28,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#F8FAFC', backdropFilter: 'blur(8px)' }}>
                  <ChevronRight size={18} />
                </button>
                <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {shots.map((_, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx ? 20 : 6, height: 6, borderRadius: 99, background: i === imgIdx ? '#F8FAFC' : 'rgba(255,255,255,0.25)', cursor: 'pointer', transition: 'all 0.2s' }} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ width: 480, height: 320, background: 'rgba(28,28,28,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <BarChart3 size={48} style={{ opacity: 0.1 }} color="#F8FAFC" />
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>No chart images</span>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div style={{ width: 380, background: 'rgba(20,20,20,0.97)', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Trade Plan</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: '#94A3B8', padding: 6, borderRadius: 8, display: 'flex' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Grade */}
          {grade && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '8px 12px 8px 10px', borderRadius: 10, background: `${GRADE_COLOR[grade]}10`, border: `1px solid ${GRADE_COLOR[grade]}30` }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${GRADE_COLOR[grade]}18`, border: `1px solid ${GRADE_COLOR[grade]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: GRADE_COLOR[grade], fontFamily: 'ui-monospace, monospace' }}>{grade}</div>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Admin grade</span>
            </div>
          )}

          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.03em', lineHeight: 1.3, marginBottom: 16 }}>{plan.title}</h2>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 9px', fontFamily: 'ui-monospace, monospace' }}>{plan.date}</span>
            {bias && (
              <span style={{ fontSize: 10, fontWeight: 700, color: BIAS_COLOR[bias], border: `1px solid ${BIAS_COLOR[bias]}35`, borderRadius: 99, padding: '3px 10px', letterSpacing: '0.04em' }}>{BIAS_LABEL[bias]}</span>
            )}
            <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLOR[status] || '#64748B', border: `1px solid ${STATUS_COLOR[status] || '#64748B'}35`, borderRadius: 99, padding: '3px 10px' }}>{STATUS_LABEL[status] || status}</span>
          </div>

          {/* Content */}
          {plan.content && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Analysis</div>
              <p style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{plan.content}</p>
            </div>
          )}

          {/* Grade comment */}
          {plan.grade_comment && (
            <div style={{ padding: '14px 16px', background: `${GRADE_COLOR[grade] || '#64748B'}08`, border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${GRADE_COLOR[grade] || '#64748B'}`, borderRadius: '0 10px 10px 0', marginTop: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: GRADE_COLOR[grade] || '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Admin feedback</div>
              <p style={{ fontSize: 13, color: '#E2E8F0', lineHeight: 1.65 }}>{plan.grade_comment}</p>
            </div>
          )}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', background: 'rgba(255,255,255,0.07)', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              <Pencil size={13} /> Edit
            </button>
            <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '9px 14px', background: 'rgba(248,113,113,0.08)', color: ROSE, border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 10, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onClick }: { plan: any; onClick: () => void }) {
  const shots: string[] = Array.isArray(plan.screenshots) ? plan.screenshots : (plan.screenshot_url ? [plan.screenshot_url] : []);
  const [hov, setHov] = useState(false);
  const bias = plan.market_bias as string;
  const grade = plan.grade as string;
  const status = plan.status as string;
  const accentCol = bias ? BIAS_COLOR[bias] : 'rgba(255,255,255,0.12)';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: FONT,
        cursor: 'pointer',
        borderRadius: 18,
        overflow: 'hidden',
        border: `1px solid ${hov ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.085)'}`,
        background: 'rgba(20,21,23,0.42)',
        backdropFilter: 'blur(20px) saturate(125%)',
        WebkitBackdropFilter: 'blur(20px) saturate(125%)',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? '0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)' : '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        transition: 'all 0.28s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Grade badge */}
      {grade && (
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 3,
          width: 28, height: 28, borderRadius: 8,
          background: `${GRADE_COLOR[grade]}10`,
          border: `1.5px solid ${GRADE_COLOR[grade]}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 12, color: GRADE_COLOR[grade],
          boxShadow: `0 2px 8px ${GRADE_COLOR[grade]}22`,
        }}>{grade}</div>
      )}

      {/* Preview area */}
      <div style={{ height: 162, background: 'rgba(8,9,12,0.75)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* bias glow */}
        {bias && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 90% 70% at 50% 40%, ${accentCol}14, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        )}

        {shots.length > 0 ? (
          <>
            <img
              src={shots[0]}
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                filter: hov ? 'brightness(0.88) saturate(0.9)' : 'brightness(0.75) saturate(0.75)',
                transform: hov ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.35s',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(10,11,14,0.92) 100%)' }} />
          </>
        ) : (
          /* chart bar icon — same as design */
          <div style={{
            position: 'relative', zIndex: 2,
            width: 68, height: 68, borderRadius: 16,
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.065)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            gap: 5, padding: '14px 12px 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            {[38, 62, 45, 80].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '2px 2px 1px 1px', background: 'linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.07))' }} />
            ))}
          </div>
        )}
      </div>

      {/* Accent line — fades at edges */}
      <div style={{
        height: 1.5, flexShrink: 0,
        background: `linear-gradient(90deg, transparent, ${accentCol} 25%, ${accentCol} 75%, transparent)`,
        boxShadow: bias ? `0 0 10px ${accentCol}55` : 'none',
      }} />

      {/* Card body */}
      <div style={{ padding: '13px 16px 16px', background: 'transparent' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#D1D9E6', letterSpacing: '-0.025em', marginBottom: 7, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {plan.title}
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(210,210,210,0.4)', fontFamily: 'ui-monospace,monospace', letterSpacing: '0.03em' }}>{plan.date}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: bias ? BIAS_COLOR[bias] : (STATUS_COLOR[status] || '#475569'), textTransform: 'uppercase' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: bias ? BIAS_COLOR[bias] : (STATUS_COLOR[status] || '#475569'), boxShadow: bias ? `0 0 6px ${BIAS_COLOR[bias]}` : 'none', flexShrink: 0 }} />
            {bias ? `${BIAS_LABEL[bias]} · ` : ''}{STATUS_LABEL[status] || status}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TradePlan() {
  const qc = useQueryClient();
  const [viewer, setViewer] = useState<any>(null);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [biasFilter, setBiasFilter] = useState('');

  const { data: plans = [] } = useQuery({ queryKey: ['trade-plans'], queryFn: () => api.getPlans() });
  const planList = Array.isArray(plans) ? plans as any[] : [];

  const filtered = biasFilter ? planList.filter((p: any) => p.market_bias === biasFilter) : planList;

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const openNew = () => { setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0], title: `Trade Plan ${new Date().toISOString().split('T')[0]}` }); setModal({}); };
  const openEdit = () => { if (!viewer) return; const p = viewer; setForm({ date: p.date, title: p.title, market_bias: p.market_bias || '', content: p.content || '', status: p.status, screenshots: Array.isArray(p.screenshots) ? p.screenshots : [] }); setViewer(null); setModal(p); };
  const doDelete = async () => {
    if (!viewer) return;
    if (!confirm(`Delete "${viewer.title}"?`)) return;
    await api.deletePlan(viewer.id);
    qc.invalidateQueries({ queryKey: ['trade-plans'] }); setViewer(null);
    toast.success('Deleted');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.id) { await api.updatePlan(modal.id, form); toast.success('Updated'); }
      else { await api.createPlan(form); toast.success('Plan created'); }
      qc.invalidateQueries({ queryKey: ['trade-plans'] }); setModal(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.06em', lineHeight: 1, marginBottom: 7 }}>Trade Plans</h2>
          <p style={{ fontSize: 12, color: '#2E3545', fontWeight: 400 }}>{planList.length} plans — click any card to view</p>
        </div>
        <GlassPill active={false} onClick={openNew}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontWeight: 600, fontSize: 11 }}>
            <Plus size={11} strokeWidth={2.5} /> New Plan
          </span>
        </GlassPill>
      </div>

      {/* Glass pill filter buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        {[
          { value: '', label: 'All Plans', color: '#F8FAFC' },
          { value: 'bullish', label: '↑ Bullish', color: MINT },
          { value: 'bearish', label: '↓ Bearish', color: ROSE },
          { value: 'neutral', label: '⇄ Neutral', color: AMBER },
        ].map(opt => (
          <GlassPill key={opt.value} active={biasFilter === opt.value} color={opt.color} onClick={() => setBiasFilter(opt.value)}>
            {opt.label}
          </GlassPill>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748B' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BarChart3 size={24} style={{ opacity: 0.3 }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>{planList.length === 0 ? 'No plans yet' : 'No matching plans'}</p>
          <p style={{ fontSize: 12 }}>{planList.length === 0 ? 'Create your first trade plan' : 'Try a different filter'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((p: any) => (
            <PlanCard key={p.id} plan={p} onClick={() => setViewer(p)} />
          ))}
        </div>
      )}

      {/* Viewer */}
      {viewer && (
        <PlanViewer plan={viewer} onClose={() => setViewer(null)} onEdit={openEdit} onDelete={doDelete} />
      )}

      {/* Create / Edit modal */}
      {modal !== null && (
        <Modal title={modal?.id ? 'Edit Plan' : 'Create Trade Plan'} onClose={() => setModal(null)} width={600}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Date"><input type="date" value={form.date} onChange={f('date')} required style={inputStyle} /></Field>
              <Field label="Market Bias">
                <select value={form.market_bias} onChange={f('market_bias')} style={selectStyle}>
                  <option value="">— No bias —</option>
                  <option value="bullish">↑ Bullish</option>
                  <option value="bearish">↓ Bearish</option>
                  <option value="neutral">↔ Neutral</option>
                </select>
              </Field>
            </div>
            <Field label="Title"><input value={form.title} onChange={f('title')} required placeholder="Trade Plan 2026-06-27" style={inputStyle} /></Field>
            <Field label="Analysis & Notes"><textarea value={form.content} onChange={f('content')} rows={5} placeholder="Market context, setups, key levels..." style={{ ...inputStyle, resize: 'vertical' }} /></Field>
            <Field label="Charts (Ctrl+V or upload)">
              <MultiImageUpload images={form.screenshots} onChange={urls => setForm(p => ({ ...p, screenshots: urls }))} active={modal !== null} maxImages={8} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Status">
                <select value={form.status} onChange={f('status')} style={selectStyle}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Plan'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
