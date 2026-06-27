import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import Modal, { Field, inputStyle, Btn } from '../../components/Modal';
import toast from 'react-hot-toast';

export default function StudentList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: api.listStudents });

  const filtered = (students as any[]).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createStudent(form);
      qc.invalidateQueries({ queryKey: ['students'] });
      setShowCreate(false);
      setForm({ name: '', email: '', password: '' });
      toast.success('Đã tạo học viên');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Xóa học viên "${name}"?`)) return;
    await api.deleteStudent(id);
    qc.invalidateQueries({ queryKey: ['students'] });
    toast.success('Đã xóa học viên');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Danh sách học viên</h2>
        <Btn onClick={() => setShowCreate(true)}><Plus size={15} style={{ display: 'inline', marginRight: 6 }} />Thêm học viên</Btn>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email..." style={{ ...inputStyle, paddingLeft: 36 }} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              {['Học viên', 'Tổng trades', 'Win Rate', 'Trade gần nhất', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có học viên nào</td></tr>
            ) : filtered.map((s: any) => {
              const wr = s.total_trades ? Math.round((s.winning_trades / s.total_trades) * 100) : 0;
              return (
                <tr key={s.id} onClick={() => navigate(`/admin/students/${s.id}`)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.name[0]}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdc}>{s.total_trades || 0}</td>
                  <td style={{ ...tdc, color: wr >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{wr}%</td>
                  <td style={{ ...tdc, color: 'var(--text-muted)' }}>{s.last_trade_at ? new Date(s.last_trade_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => remove(s.id, s.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4 }} title="Xóa">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="Thêm học viên mới" onClose={() => setShowCreate(false)}>
          <form onSubmit={create}>
            <Field label="Họ tên"><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required style={inputStyle} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required style={inputStyle} /></Field>
            <Field label="Mật khẩu"><input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} style={inputStyle} /></Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setShowCreate(false)}>Hủy</Btn>
              <Btn type="submit" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo học viên'}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const tdc: React.CSSProperties = { padding: '14px 16px', fontSize: 13 };
