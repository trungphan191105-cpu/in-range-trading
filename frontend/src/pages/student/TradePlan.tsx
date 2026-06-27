/**
 * Trade Plans — Slash "nocturnal private bank" design system
 * Photo library layout: image-first masonry grid, gold accents, 10px card radius
 * Obsidian #000 canvas | Slate #1c1d22 cards | Ember Gold #cc9166 accent
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, selectStyle, Btn } from '../../components/Modal';
import MultiImageUpload from '../../components/MultiImageUpload';
import toast from 'react-hot-toast';

// ── Slash palette ──
const S = {
  canvas:  '#000000',
  inkwell: '#08080a',
  graphite:'#121317',
  slate:   '#1c1d22',
  iron:    '#2e3038',
  steel:   '#464853',
  fog:     '#5e616e',
  ash:     '#777a88',
  silver:  '#9194a1',
  pearl:   '#acafb9',
  bone:    '#e2e3e9',
  paper:   '#ffffff',
  gold:    '#cc9166',
  molten:  'linear-gradient(103deg, rgb(174,147,87), rgb(255,240,204) 40%, rgb(174,147,87) 70%, rgba(189,157,79,0))',
};

const gradeColor: Record<string, string> = { A: '#10d98a', B: '#4f95f5', C: '#f5b142', D: '#f0506e' };
const biasColor: Record<string, string>  = { bullish: '#10d98a', bearish: '#f0506e', neutral: '#f5b142' };
const biasLabel: Record<string, string>  = { bullish: '↑ BULL', bearish: '↓ BEAR', neutral: '↔ NEUTRAL' };
const statusColor: Record<string, string> = { draft: S.ash, published: '#4f95f5', reviewed: '#10d98a' };
const statusLabel: Record<string, string> = { draft: 'Draft', published: 'Published', reviewed: 'Reviewed' };

const defaultForm = { date: '', title: '', market_bias: '', content: '', status: 'draft', screenshots: [] as string[] };

// ── Lightbox / plan viewer ──
function PlanViewer({ plan, onClose, onEdit, onDelete }: { plan: any; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const shots: string[] = Array.isArray(plan.screenshots) ? plan.screenshots : (plan.screenshot_url ? [plan.screenshot_url] : []);
  const [imgIdx, setImgIdx] = useState(0);

  const prev = () => setImgIdx(i => (i - 1 + shots.length) % shots.length);
  const next = () => setImgIdx(i => (i + 1) % shots.length);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.96)', display: 'flex', alignItems: 'stretch' }}
      onClick={onClose}>
      {/* Image panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '48px 24px' }}
        onClick={e => e.stopPropagation()}>
        {shots.length > 0 ? (
          <>
            <img src={shots[imgIdx]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 10, border: `1px solid ${S.iron}` }} />
            {shots.length > 1 && (
              <>
                <button onClick={prev} style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', background: S.slate, border: `1px solid ${S.iron}`, borderRadius: 2, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: S.bone }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={next} style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', background: S.slate, border: `1px solid ${S.iron}`, borderRadius: 2, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: S.bone }}>
                  <ChevronRight size={18} />
                </button>
                <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {shots.map((_, i) => (
                    <div key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx ? 20 : 6, height: 6, borderRadius: 9999, background: i === imgIdx ? S.gold : S.steel, cursor: 'pointer', transition: 'all 0.2s' }} />
                  ))}
                </div>
              </>
            )}
            {/* Thumbnail strip */}
            {shots.length > 1 && (
              <div style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, padding: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: 10, border: `1px solid ${S.iron}` }}>
                {shots.map((u, i) => (
                  <img key={i} src={u} alt="" onClick={() => setImgIdx(i)} style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, border: `1.5px solid ${i === imgIdx ? S.gold : 'transparent'}`, cursor: 'pointer', opacity: i === imgIdx ? 1 : 0.5, transition: 'all 0.15s' }} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ width: 480, height: 320, background: S.slate, border: `1px solid ${S.iron}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: S.ash }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>No chart images</div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar — plan meta */}
      <div style={{ width: 360, background: S.inkwell, borderLeft: `1px solid ${S.iron}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${S.iron}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: S.ash, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Trade Plan</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: S.ash, display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Grade */}
          {plan.grade && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 2, background: S.graphite, border: `1px solid ${gradeColor[plan.grade]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: gradeColor[plan.grade], fontFamily: 'ui-monospace, monospace' }}>{plan.grade}</div>
                <span style={{ fontSize: 12, color: S.pearl }}>Admin grade</span>
              </div>
            </div>
          )}

          {/* Title */}
          <h2 style={{ fontSize: 20, fontWeight: 600, color: S.paper, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 16 }}>{plan.title}</h2>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: S.ash, background: S.graphite, border: `1px solid ${S.iron}`, borderRadius: 2, padding: '3px 8px', fontFamily: 'ui-monospace, monospace' }}>{plan.date}</span>
            {plan.market_bias && (
              <span style={{ fontSize: 11, fontWeight: 600, color: biasColor[plan.market_bias], border: `1px solid ${biasColor[plan.market_bias]}44`, borderRadius: 9999, padding: '3px 10px', letterSpacing: '0.04em' }}>{biasLabel[plan.market_bias]}</span>
            )}
            <span style={{ fontSize: 11, fontWeight: 500, color: statusColor[plan.status], border: `1px solid ${statusColor[plan.status]}44`, borderRadius: 9999, padding: '3px 10px' }}>{statusLabel[plan.status]}</span>
            {shots.length > 0 && (
              <span style={{ fontSize: 11, color: S.gold, border: `1px solid ${S.gold}44`, borderRadius: 9999, padding: '3px 10px' }}>{shots.length} chart{shots.length > 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Content */}
          {plan.content && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: S.fog, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Analysis</div>
              <p style={{ fontSize: 13, color: S.bone, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{plan.content}</p>
            </div>
          )}

          {/* Grade comment */}
          {plan.grade_comment && (
            <div style={{ padding: '14px 16px', background: S.graphite, border: `1px solid ${S.iron}`, borderLeft: `3px solid ${gradeColor[plan.grade]}`, borderRadius: 2, marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: gradeColor[plan.grade], letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Admin feedback</div>
              <p style={{ fontSize: 13, color: S.bone, lineHeight: 1.65 }}>{plan.grade_comment}</p>
            </div>
          )}

          {/* Gold accent line */}
          <div style={{ height: 1, background: S.molten, marginTop: 24, marginBottom: 20 }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: S.paper, color: S.inkwell, border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 500, cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
              <Pencil size={13} /> Edit
            </button>
            <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'transparent', color: '#f0506e', border: '1px solid #f0506e44', borderRadius: 2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Plan thumbnail card ──
function PlanCard({ plan, onClick }: { plan: any; onClick: () => void }) {
  const shots: string[] = Array.isArray(plan.screenshots) ? plan.screenshots : (plan.screenshot_url ? [plan.screenshot_url] : []);
  const [hov, setHov] = useState(false);

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: S.slate, border: `1px solid ${hov ? S.steel : S.iron}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s', transform: hov ? 'translateY(-2px)' : 'none', boxShadow: hov ? `0 8px 24px rgba(0,0,0,0.5)` : 'none' }}>

      {/* Image or placeholder */}
      <div style={{ position: 'relative', aspectRatio: '16/10', background: S.graphite, overflow: 'hidden' }}>
        {shots.length > 0 ? (
          <img src={shots[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hov ? 'scale(1.04)' : 'scale(1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 28, opacity: 0.12 }}>📊</div>
            {plan.content && (
              <p style={{ fontSize: 10, color: S.fog, textAlign: 'center', padding: '0 16px', lineHeight: 1.6, maxHeight: 80, overflow: 'hidden', letterSpacing: '0.01em' }}>
                {plan.content.slice(0, 120)}{plan.content.length > 120 ? '…' : ''}
              </p>
            )}
          </div>
        )}

        {/* Grade badge */}
        {plan.grade && (
          <div style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 2, background: 'rgba(0,0,0,0.85)', border: `1px solid ${gradeColor[plan.grade]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: gradeColor[plan.grade], fontFamily: 'ui-monospace, monospace' }}>
            {plan.grade}
          </div>
        )}

        {/* Image count */}
        {shots.length > 1 && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.75)', border: `1px solid ${S.iron}`, borderRadius: 2, padding: '2px 7px', fontSize: 10, color: S.silver, fontWeight: 500 }}>
            1/{shots.length}
          </div>
        )}

        {/* Bias bar at bottom */}
        {plan.market_bias && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: biasColor[plan.market_bias] }} />
        )}

        {/* Hover overlay */}
        {hov && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: S.paper, background: 'rgba(0,0,0,0.7)', border: `1px solid ${S.steel}`, borderRadius: 2, padding: '5px 12px', letterSpacing: '0.05em' }}>VIEW</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: S.bone, marginBottom: 5, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: S.ash, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}>{plan.date}</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {plan.market_bias && (
              <span style={{ fontSize: 9, fontWeight: 700, color: biasColor[plan.market_bias], letterSpacing: '0.06em' }}>{biasLabel[plan.market_bias]}</span>
            )}
            <span style={{ fontSize: 9, fontWeight: 500, color: statusColor[plan.status], letterSpacing: '0.04em' }}>{statusLabel[plan.status].toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──
export default function TradePlan() {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');

  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: () => api.getPlans() });

  const openNew = () => {
    setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0], screenshots: [] });
    setEditOpen({});
  };
  const openEdit = (p: any) => {
    const shots = Array.isArray(p.screenshots) ? p.screenshots : (p.screenshot_url ? [p.screenshot_url] : []);
    setForm({ date: p.date, title: p.title, market_bias: p.market_bias || '', content: p.content || '', status: p.status, screenshots: shots });
    setEditOpen(p);
    setViewing(null);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = { date: form.date, title: form.title, market_bias: form.market_bias || null, content: form.content || null, status: form.status, screenshots: form.screenshots, screenshot_url: form.screenshots[0] || null };
      if (editOpen?.id) { await api.updatePlan(editOpen.id, data); toast.success('Updated'); }
      else { await api.createPlan(data); toast.success('Plan created'); }
      qc.invalidateQueries({ queryKey: ['plans'] });
      setEditOpen(null);
    } catch (ex: any) { toast.error(ex.message); }
    finally { setSaving(false); }
  };
  const deletePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    await api.deletePlan(id);
    qc.invalidateQueries({ queryKey: ['plans'] });
    setViewing(null);
    toast.success('Deleted');
  };

  const filtered = (plans as any[]).filter(p => filter === 'all' || p.market_bias === filter);

  return (
    <div style={{ background: S.canvas, minHeight: '100%', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ padding: '28px 0 24px', borderBottom: `1px solid ${S.iron}`, marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: S.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Library</div>
          <h1 style={{ fontSize: 28, fontWeight: 400, color: S.paper, letterSpacing: '-0.025em', lineHeight: 1, fontFamily: "'DM Serif Display', Georgia, serif" }}>
            Trade Plans
          </h1>
          <p style={{ fontSize: 13, color: S.ash, marginTop: 6, letterSpacing: '-0.007em' }}>
            {(plans as any[]).length} plans — click any card to view
          </p>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: S.paper, color: S.inkwell, border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.007em', transition: 'all 0.15s', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e2e3e9')}
          onMouseLeave={e => (e.currentTarget.style.background = S.paper)}>
          <Plus size={14} /> New Plan
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'bullish', 'bearish', 'neutral'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 9999, border: `1px solid ${filter === f ? (f === 'all' ? S.gold : biasColor[f] || S.gold) : S.steel}`, background: 'transparent', color: filter === f ? (f === 'all' ? S.gold : biasColor[f] || S.gold) : S.ash, fontSize: 11, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s' }}>
            {f === 'all' ? 'All Plans' : biasLabel[f]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: S.fog, alignSelf: 'center' }}>{filtered.length} results</span>
      </div>

      {/* Gallery grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '120px 0', color: S.ash }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.15 }}>📷</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: S.pearl, marginBottom: 6 }}>No plans yet</p>
          <p style={{ fontSize: 13, color: S.fog }}>Create your first plan to build your library</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map((p: any) => (
            <PlanCard key={p.id} plan={p} onClick={() => setViewing(p)} />
          ))}
        </div>
      )}

      {/* Plan viewer lightbox */}
      {viewing && (
        <PlanViewer
          plan={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
          onDelete={() => deletePlan(viewing.id)}
        />
      )}

      {/* Edit/create modal */}
      {editOpen !== null && (
        <Modal title={editOpen?.id ? 'Edit Plan' : 'New Trade Plan'} onClose={() => setEditOpen(null)} width={640}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Date">
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required style={inputStyle} />
              </Field>
              <Field label="Market Bias">
                <select value={form.market_bias} onChange={e => setForm(p => ({ ...p, market_bias: e.target.value }))} style={selectStyle}>
                  <option value="">— Select —</option>
                  <option value="bullish">↑ Bullish</option>
                  <option value="bearish">↓ Bearish</option>
                  <option value="neutral">↔ Neutral</option>
                </select>
              </Field>
            </div>
            <Field label="Title">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Trade Plan 2024-01-15" style={inputStyle} />
            </Field>
            <Field label="Chart images (Ctrl+V or upload)">
              <MultiImageUpload images={form.screenshots} onChange={urls => setForm(p => ({ ...p, screenshots: urls }))} active={editOpen !== null} maxImages={10} />
            </Field>
            <Field label="Analysis notes">
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={7}
                placeholder="Market analysis, key levels, trade plan..." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }} />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setEditOpen(null)}>Cancel</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : editOpen?.id ? 'Update' : 'Create Plan'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
