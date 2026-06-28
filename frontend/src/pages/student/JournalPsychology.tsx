import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Brain, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, Btn } from '../../components/Modal';
import { useAuthStore } from '../../store/auth';
import toast from 'react-hot-toast';
import { EMOTIONS, EmotionBall, EmotionDisplay } from '../../components/EmotionBall';

const defaultForm = { date: '', emotion: 'calm', discipline_score: '7', notes: '' };

interface Props { studentId?: string }

const FONT = "'Inter', system-ui, sans-serif";
const GLASS: React.CSSProperties = {
  background: 'rgba(20,21,23,0.42)',
  backdropFilter: 'blur(20px) saturate(125%)',
  WebkitBackdropFilter: 'blur(20px) saturate(125%)',
  border: '1px solid rgba(255,255,255,0.085)',
  borderRadius: 16,
  boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

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
    <div style={{ fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(220,220,220,0.42)', textTransform: 'uppercase', marginBottom: 5 }}>TRADE JOURNAL</div>
          <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', color: '#f3f3f3' }}>Tâm lý giao dịch</h2>
        </div>
        {!studentId && (
          <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 14, background: 'rgba(28,29,31,0.6)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', color: '#ededed', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 15, fontWeight: 400, lineHeight: 1 }}>+</span> New Entry
          </button>
        )}
      </div>

      {(entries as any[]).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Brain size={44} style={{ marginBottom: 14, opacity: 0.12, color: '#f0f0f0' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(210,210,210,0.45)', marginBottom: 4 }}>Chưa có nhật ký tâm lý nào</p>
          <p style={{ fontSize: 11, color: 'rgba(180,180,180,0.3)' }}>Click "New Entry" để thêm nhật ký đầu tiên</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 13 }}>
          {(entries as any[]).map(e => (
            <div key={e.id} style={{ ...GLASS, padding: '16px 18px', transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(210,210,210,0.45)', fontWeight: 500 }}>{e.date}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!studentId && <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(210,210,210,0.45)', fontSize: 11, padding: '2px 6px', fontFamily: FONT }}>Sửa</button>}
                  {isAdmin && <button onClick={() => { setFeedbackId(e.id); setFeedbackText(e.admin_feedback || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60A5FA', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, fontFamily: FONT }}><MessageSquare size={11} /> Góp ý</button>}
                  {!studentId && <button onClick={() => del(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef8b78', fontSize: 11, fontFamily: FONT }}>Xóa</button>}
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

              {e.notes && <p style={{ fontSize: 12, color: 'rgba(210,210,210,0.7)', lineHeight: 1.65, marginTop: 8 }}>{e.notes}</p>}

              {feedbackId === e.id ? (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Góp ý của Mentor</div>
                  <textarea value={feedbackText} onChange={ev => setFeedbackText(ev.target.value)} rows={3} placeholder="Nhận xét về tâm lý giao dịch..." style={{ ...inputStyle, fontSize: 12, resize: 'vertical', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setFeedbackId(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer', color: 'rgba(210,210,210,0.45)', fontFamily: FONT }}>Hủy</button>
                    <button onClick={() => saveFeedback(e.id)} disabled={savingFeedback} style={{ background: '#60A5FA', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#040810', fontFamily: FONT }}>
                      {savingFeedback ? '...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : e.admin_feedback ? (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, marginTop: 10, background: 'rgba(96,165,250,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={9} /> Góp ý của Mentor</div>
                  <p style={{ fontSize: 12, color: 'rgba(210,210,210,0.7)', lineHeight: 1.6, margin: 0 }}>{e.admin_feedback}</p>
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
