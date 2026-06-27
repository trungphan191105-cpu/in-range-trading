import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Brain, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, Btn } from '../../components/Modal';
import { useAuthStore } from '../../store/auth';
import toast from 'react-hot-toast';

// ── Emotion definitions (Inside Out style) ──────────────────────────────────
const EMOTIONS = [
  { id: 'joy',          label: 'Joy',          color: '#f5c842', glow: 'rgba(245,200,66,0.45)',   eyes: 'smile'   },
  { id: 'calm',         label: 'Calm',         color: '#5bc4d4', glow: 'rgba(91,196,212,0.45)',   eyes: 'neutral' },
  { id: 'confident',    label: 'Confident',    color: '#4ebe96', glow: 'rgba(78,190,150,0.45)',   eyes: 'content' },
  { id: 'sadness',      label: 'Sadness',      color: '#6fa3e0', glow: 'rgba(111,163,224,0.45)',  eyes: 'sad'     },
  { id: 'anxiety',      label: 'Anxiety',      color: '#e8965a', glow: 'rgba(232,150,90,0.45)',   eyes: 'nervous' },
  { id: 'anger',        label: 'Anger',        color: '#d65a5a', glow: 'rgba(214,90,90,0.45)',    eyes: 'angry'   },
  { id: 'fearful',      label: 'Fear',         color: '#b49fcc', glow: 'rgba(180,159,204,0.45)',  eyes: 'scared'  },
  { id: 'greedy',       label: 'Greed',        color: '#d4a044', glow: 'rgba(212,160,68,0.45)',   eyes: 'smirk'   },
  { id: 'revenge',      label: 'Revenge',      color: '#c8746a', glow: 'rgba(200,116,106,0.45)',  eyes: 'angry'   },
];

const emotionMap = Object.fromEntries(EMOTIONS.map(e => [e.id, e]));

// ── SVG emotion ball component ───────────────────────────────────────────────
function EmotionBall({ emotion, size = 52, selected, onClick }: { emotion: typeof EMOTIONS[0]; size?: number; selected?: boolean; onClick?: () => void }) {
  const { color, glow, eyes } = emotion;
  const r = size / 2;

  const eyePairs: Record<string, [string, string]> = {
    smile:   ['M10 12 Q12 14 14 12', 'M7 10 Q7.5 9 8.5 10 M15.5 10 Q16.5 9 17 10'],
    neutral: ['M9 13 L15 13', 'M8 10 H9 M15 10 H16'],
    content: ['M9.5 13 Q12 14.5 14.5 13', 'M8 10 H9 M15 10 H16'],
    sad:     ['M9.5 15 Q12 13.5 14.5 15', 'M8 9.5 Q8.5 11 9.5 10 M14.5 10 Q15.5 11 16 9.5'],
    nervous: ['M9 13 L15 13', 'M7.5 9.5 L8.5 10.5 M15.5 10.5 L16.5 9.5'],
    angry:   ['M9 15 Q12 13 15 15', 'M7.5 11 L9.5 10 M14.5 10 L16.5 11'],
    scared:  ['M10 14 Q12 12.5 14 14', 'M8 9 Q9 8 10 10 M14 10 Q15 8 16 9'],
    smirk:   ['M9 13 Q11 14 13 12', 'M8 10 H9 M15 10 H16'],
  };

  const [mouth, eyebrows] = eyePairs[eyes] ?? eyePairs.neutral;

  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        padding: '6px 4px', borderRadius: 10,
        outline: selected ? `2px solid ${color}` : '2px solid transparent',
        outlineOffset: 2,
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        transform: selected ? 'scale(1.12)' : 'scale(1)',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`bg-${emotion.id}`} cx="35%" cy="28%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </radialGradient>
          <filter id={`glow-${emotion.id}`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Ball */}
        <circle cx="12" cy="12" r="10" fill={`url(#bg-${emotion.id})`} filter={selected ? `url(#glow-${emotion.id})` : undefined} />
        {/* Highlight */}
        <ellipse cx="9" cy="8" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.22)" />
        {/* Eyes */}
        <circle cx="9" cy="10.5" r="1.1" fill="rgba(0,0,0,0.7)" />
        <circle cx="15" cy="10.5" r="1.1" fill="rgba(0,0,0,0.7)" />
        {/* Eyebrows */}
        <path d={eyebrows} stroke="rgba(0,0,0,0.6)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        {/* Mouth */}
        <path d={mouth} stroke="rgba(0,0,0,0.65)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 9, fontWeight: 600, color: selected ? color : '#868f97', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
        {emotion.label}
      </span>
    </button>
  );
}

// ── Display ball (smaller, in cards) ────────────────────────────────────────
function EmotionDisplay({ emotionId }: { emotionId: string }) {
  const em = emotionMap[emotionId];
  if (!em) return <span style={{ fontSize: 13, color: '#868f97' }}>—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <EmotionBall emotion={em} size={32} />
      <div>
        <div style={{ fontWeight: 600, color: em.color, fontSize: 13 }}>{em.label}</div>
        <div style={{ fontSize: 11, color: '#868f97' }}>Cảm xúc</div>
      </div>
    </div>
  );
}

const defaultForm = { date: '', emotion: 'calm', discipline_score: '7', notes: '' };

interface Props { studentId?: string }

export default function JournalPsychology({ studentId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const params: any = { type: 'psychology' };
  if (studentId) params.studentId = studentId;

  const { data: entries = [] } = useQuery({ queryKey: ['journals', 'psychology', studentId], queryFn: () => api.getJournals(params) });

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const openNew = () => { setForm({ ...defaultForm, date: new Date().toISOString().split('T')[0] }); setModal({}); };
  const openEdit = (t: any) => { setForm({ date: t.date, emotion: t.emotion || 'calm', discipline_score: t.discipline_score || '7', notes: t.notes || '' }); setModal(t); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, type: 'psychology', discipline_score: parseInt(form.discipline_score) };
      if (modal?.id) { await api.updateJournal(modal.id, data); toast.success('Đã cập nhật'); }
      else { await api.createJournal(data); toast.success('Đã thêm'); }
      qc.invalidateQueries({ queryKey: ['journals', 'psychology'] });
      setModal(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Xóa?')) return;
    await api.deleteJournal(id);
    qc.invalidateQueries({ queryKey: ['journals', 'psychology'] });
    toast.success('Đã xóa');
  };

  const saveFeedback = async (id: string) => {
    setSavingFeedback(true);
    try {
      await api.updateJournal(id, { admin_feedback: feedbackText });
      qc.invalidateQueries({ queryKey: ['journals', 'psychology'] });
      toast.success('Đã lưu góp ý');
      setFeedbackId(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingFeedback(false); }
  };

  const score = parseInt(form.discipline_score);
  const scoreColor = score >= 7 ? '#4ebe96' : score >= 5 ? '#d4a044' : '#c8746a';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#479ffa', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Trade Journal</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em' }}>Tâm lý giao dịch</h2>
        </div>
        {!studentId && (
          <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#e6e6e6', border: '1px solid #e6e6e6', borderRadius: 99, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <Plus size={13} /> New Entry
          </button>
        )}
      </div>

      {(entries as any[]).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <Brain size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p>Chưa có nhật ký tâm lý nào</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
          {(entries as any[]).map(e => (
            <div key={e.id} style={{ background: 'rgba(19,19,19,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 18px', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#868f97', fontWeight: 500 }}>{e.date}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!studentId && <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#868f97', fontSize: 11, padding: '2px 6px' }}>Sửa</button>}
                  {isAdmin && <button onClick={() => { setFeedbackId(e.id); setFeedbackText(e.admin_feedback || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#479ffa', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><MessageSquare size={11} /> Góp ý</button>}
                  {!studentId && <button onClick={() => del(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8746a', fontSize: 11 }}>Xóa</button>}
                </div>
              </div>

              <EmotionDisplay emotionId={e.emotion} />

              {/* Discipline bar */}
              <div style={{ margin: '14px 0 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                  <span style={{ color: '#868f97' }}>Discipline</span>
                  <span style={{ fontWeight: 700, color: e.discipline_score >= 7 ? '#4ebe96' : e.discipline_score >= 5 ? '#d4a044' : '#c8746a' }}>{e.discipline_score}/10</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${e.discipline_score * 10}%`, background: e.discipline_score >= 7 ? '#4ebe96' : e.discipline_score >= 5 ? '#d4a044' : '#c8746a', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>

              {e.notes && <p style={{ fontSize: 12, color: '#cccccc', lineHeight: 1.65, marginTop: 8 }}>{e.notes}</p>}

              {feedbackId === e.id ? (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#479ffa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Góp ý của Mentor</div>
                  <textarea value={feedbackText} onChange={ev => setFeedbackText(ev.target.value)} rows={3} placeholder="Nhận xét về tâm lý giao dịch..." style={{ ...inputStyle, fontSize: 12, resize: 'vertical', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setFeedbackId(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer', color: '#868f97' }}>Hủy</button>
                    <button onClick={() => saveFeedback(e.id)} disabled={savingFeedback} style={{ background: '#479ffa', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#040810' }}>
                      {savingFeedback ? '...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : e.admin_feedback ? (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 10, background: 'rgba(71,159,250,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#479ffa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={9} /> Góp ý của Mentor</div>
                  <p style={{ fontSize: 12, color: '#cccccc', lineHeight: 1.6, margin: 0 }}>{e.admin_feedback}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {modal !== null && !studentId && (
        <Modal title={modal?.id ? 'Sửa nhật ký tâm lý' : 'Thêm nhật ký tâm lý'} onClose={() => setModal(null)} width={520}>
          <form onSubmit={save}>
            <Field label="Ngày">
              <input type="date" value={form.date} onChange={f('date')} required style={inputStyle} />
            </Field>

            <Field label="Cảm xúc hôm nay">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, padding: '6px 0' }}>
                {EMOTIONS.map(em => (
                  <EmotionBall
                    key={em.id}
                    emotion={em}
                    size={44}
                    selected={form.emotion === em.id}
                    onClick={() => setForm(p => ({ ...p, emotion: em.id }))}
                  />
                ))}
              </div>
            </Field>

            <Field label={`Điểm Discipline: ${score}/10`}>
              <input type="range" min={1} max={10} value={form.discipline_score} onChange={f('discipline_score')}
                style={{ width: '100%', accentColor: scoreColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#868f97', marginTop: 4 }}>
                <span>1 — Rất tệ</span><span style={{ color: scoreColor, fontWeight: 700 }}>{score}</span><span>10 — Xuất sắc</span>
              </div>
            </Field>

            <Field label="Ghi chú tâm lý">
              <textarea value={form.notes} onChange={f('notes')} rows={5} placeholder="Hôm nay tôi cảm thấy... Lý do vào lệnh... Bài học rút ra..." style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Hủy</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
