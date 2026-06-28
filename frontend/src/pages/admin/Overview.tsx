import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../../lib/api';
import KPIStrip from '../../components/KPIStrip';
import { Users, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminOverview() {
  const { data } = useQuery({ queryKey: ['class-stats'], queryFn: api.getClassStats });
  const navigate = useNavigate();

  const summary = data?.summary;
  const students: any[] = data?.students || [];

  const kpis = [
    { label: 'Tổng học viên', value: summary?.total_students ?? '—' },
    { label: 'Tổng trades', value: summary?.total_trades ?? '—' },
    { label: 'Win Rate lớp', value: summary?.class_win_rate != null ? `${summary.class_win_rate}%` : '—', color: (summary?.class_win_rate ?? 0) >= 50 ? 'var(--green)' : 'var(--red)' },
    { label: 'PnL lớp', value: summary?.class_pnl != null ? `$${summary.class_pnl.toFixed(2)}` : '—', color: (summary?.class_pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Tổng quan lớp học</h2>
      <KPIStrip kpis={kpis} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* PnL ranking */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>PnL theo học viên</h3>
          {students.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={students} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`$${Number(v).toFixed(2)}`, 'PnL']} />
                <Bar dataKey="total_pnl" radius={[0, 4, 4, 0]}>
                  {students.map((s, i) => <Cell key={i} fill={s.total_pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>
          )}
        </div>


        {/* Win rate ranking */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Win Rate ranking</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {students.slice(0, 6).sort((a, b) => b.win_rate - a.win_rate).map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(`/admin/students/${s.id}`)}>
                <span style={{ width: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'right' }}>#{i + 1}</span>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>{s.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.win_rate}%`, background: s.win_rate >= 50 ? 'var(--green)' : 'var(--red)', borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.win_rate >= 50 ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>{s.win_rate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student activity table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Hoạt động học viên</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              {['Học viên', 'Tổng trades', 'Đã đóng', 'Win Rate', 'PnL', 'Trade gần nhất'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id} onClick={() => navigate(`/admin/students/${s.id}`)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.name[0]}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                    </div>
                  </div>
                </td>
                <td style={tdc}>{s.total_trades || 0}</td>
                <td style={tdc}>{s.closed_trades || 0}</td>
                <td style={{ ...tdc, color: s.win_rate >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{s.win_rate}%</td>
                <td style={{ ...tdc, color: s.total_pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{s.total_pnl != null ? `${s.total_pnl >= 0 ? '+' : ''}$${Number(s.total_pnl).toFixed(2)}` : '—'}</td>
                <td style={{ ...tdc, color: 'var(--text-muted)' }}>{s.last_trade || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tdc: React.CSSProperties = { padding: '12px 16px', fontSize: 13 };
