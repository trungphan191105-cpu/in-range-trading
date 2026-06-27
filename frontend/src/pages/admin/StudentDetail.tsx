import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronLeft, ChevronDown, Star } from 'lucide-react';
import { api } from '../../lib/api';
import Reports from '../student/Reports';
import JournalPsychology from '../student/JournalPsychology';
import Accounts from '../student/Accounts';
import Modal, { Field, selectStyle, inputStyle, Btn } from '../../components/Modal';
import toast from 'react-hot-toast';

const gradeColor: Record<string, string> = { A: 'var(--green)', B: 'var(--blue)', C: 'var(--yellow)', D: 'var(--red)' };
const tabs = ['reports', 'plans', 'journal', 'psychology', 'accounts'] as const;

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<typeof tabs[number]>('reports');
  const [gradingPlan, setGradingPlan] = useState<any>(null);
  const [gradeForm, setGradeForm] = useState({ grade: 'A', grade_comment: '' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: student } = useQuery({ queryKey: ['student', id], queryFn: () => api.getStudent(id!) });
  const { data: plans = [] } = useQuery({ queryKey: ['plans', id], queryFn: () => api.getPlans({ studentId: id! }) });
  const { data: journals = [] } = useQuery({ queryKey: ['journals', 'idea', id], queryFn: () => api.getJournals({ type: 'idea', studentId: id! }) });
const submitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updatePlan(gradingPlan.id, { ...gradeForm, status: 'reviewed' });
    qc.invalidateQueries({ queryKey: ['plans', id] });
    setGradingPlan(null);
    toast.success('Đã chấm điểm');
  };

  if (!student) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Đang tải...</div>;

  return (
    <div>
      <button onClick={() => navigate('/admin/students')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, padding: 0 }}>
        <ChevronLeft size={16} /> Danh sách học viên
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white' }}>{(student as any).name[0]}</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{(student as any).name}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(student as any).email}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['reports','Reports'], ['plans','Trade Plans'], ['journal','Journal Idea'], ['psychology','Tâm lý'], ['accounts','Accounts']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as any)} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === k ? 600 : 400, background: tab === k ? 'var(--accent)' : 'transparent', color: tab === k ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}>{label}</button>
        ))}
      </div>

      {tab === 'reports' && <Reports studentId={id} />}

      {tab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(plans as any[]).length === 0 ? <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có plan nào</div> : (plans as any[]).map(p => (
            <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                {p.grade ? (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: gradeColor[p.grade] + '20', color: gradeColor[p.grade], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{p.grade}</div>
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Star size={16} color="var(--text-muted)" /></div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.date} · {p.status}</div>
                </div>
                <ChevronDown size={16} color="var(--text-muted)" style={{ transform: expanded === p.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </div>
              {expanded === p.id && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                  {p.content && <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginTop: 14, whiteSpace: 'pre-wrap' }}>{p.content}</p>}
                  {p.grade_comment && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, borderLeft: `3px solid ${gradeColor[p.grade]}` }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Nhận xét</div>
                      <p style={{ fontSize: 13, color: 'var(--text)' }}>{p.grade_comment}</p>
                    </div>
                  )}
                  <div style={{ marginTop: 14 }}>
                    <Btn onClick={() => { setGradingPlan(p); setGradeForm({ grade: p.grade || 'A', grade_comment: p.grade_comment || '' }); }}>
                      <Star size={13} style={{ display: 'inline', marginRight: 6 }} />{p.grade ? 'Sửa điểm' : 'Chấm điểm'}
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'journal' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              {['Ngày','Symbol','Hướng','Entry','PnL','R:R','Status'].map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(journals as any[]).map(t => (
                <tr key={t.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={tdc}>{t.date}</td>
                  <td style={{ ...tdc, fontWeight:600 }}>{t.symbol||'—'}</td>
                  <td style={{ ...tdc, color:t.direction==='long'?'var(--green)':'var(--red)' }}>{t.direction?.toUpperCase()||'—'}</td>
                  <td style={tdc}>{t.entry_price??'—'}</td>
                  <td style={{ ...tdc, color:(t.pnl??0)>=0?'var(--green)':'var(--red)', fontWeight:600 }}>{t.pnl!=null?`${t.pnl>=0?'+':''}${Number(t.pnl).toFixed(2)}$`:'—'}</td>
                  <td style={{ ...tdc, color:'var(--accent)' }}>{t.rr_ratio?`1:${t.rr_ratio}`:'—'}</td>
                  <td style={tdc}><span style={{ fontSize:11,padding:'2px 8px',borderRadius:20, background:t.status==='open'?'rgba(59,130,246,0.15)':'rgba(34,197,94,0.1)', color:t.status==='open'?'var(--blue)':'var(--green)' }}>{t.status==='open'?'Mở':'Đóng'}</span></td>
                </tr>
              ))}
              {!(journals as any[]).length && <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Chưa có trade</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'psychology' && <JournalPsychology studentId={id} />}

      {tab === 'accounts' && <Accounts studentId={id} />}

      {gradingPlan && (
        <Modal title={`Chấm điểm: ${gradingPlan.title}`} onClose={() => setGradingPlan(null)} width={440}>
          <form onSubmit={submitGrade}>
            <Field label="Điểm">
              <div style={{ display:'flex',gap:8 }}>
                {['A','B','C','D'].map(g => (
                  <button key={g} type="button" onClick={() => setGradeForm(p=>({...p,grade:g}))} style={{ flex:1,padding:'12px',borderRadius:8,border:`2px solid ${gradeForm.grade===g?gradeColor[g]:'var(--border)'}`, background:gradeForm.grade===g?gradeColor[g]+'20':'var(--surface2)', color:gradeForm.grade===g?gradeColor[g]:'var(--text-muted)', fontWeight:700,fontSize:20,cursor:'pointer' }}>{g}</button>
                ))}
              </div>
            </Field>
            <Field label="Nhận xét">
              <textarea value={gradeForm.grade_comment} onChange={e=>setGradeForm(p=>({...p,grade_comment:e.target.value}))} rows={4} placeholder="Nhận xét chi tiết..." style={{ ...inputStyle,resize:'vertical' }}/>
            </Field>
            <div style={{ display:'flex',gap:8,justifyContent:'flex-end',marginTop:8 }}>
              <Btn variant="ghost" onClick={()=>setGradingPlan(null)}>Hủy</Btn>
              <Btn type="submit">Lưu điểm</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const tdc: React.CSSProperties = { padding:'10px 14px', fontSize:13 };
