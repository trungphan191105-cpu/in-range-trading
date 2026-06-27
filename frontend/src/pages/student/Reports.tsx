import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../../lib/api';
import KPIStrip from '../../components/KPIStrip';
import EquityCurve from '../../components/EquityCurve';
import TradeDetailPanel from '../../components/TradeDetailPanel';
import { useFilters } from '../../hooks/useFilters';
import { Printer, RotateCcw } from 'lucide-react';
import { inputStyle, selectStyle } from '../../components/Modal';

const PAGE_SIZE = 10;

export default function Reports({ studentId }: { studentId?: string }) {
  const { filters, setFilters, resetFilters } = useFilters('reports' + (studentId || ''), { from: '', to: '', symbol: '', direction: '', status: '', account_id: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts(), enabled: !studentId });

  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (studentId) params.studentId = studentId;
  if (filters.account_id) params.account_id = filters.account_id;

  const tradeParams: Record<string, string> = { type: 'idea', ...params };
  if (filters.symbol) tradeParams.symbol = filters.symbol;
  if (filters.direction) tradeParams.direction = filters.direction;
  if (filters.status) tradeParams.status = filters.status;

  const { data: stats } = useQuery({ queryKey: ['stats', params, studentId], queryFn: () => api.getStats(params) });
  const { data: trades = [] } = useQuery({ queryKey: ['journals', 'reports', tradeParams], queryFn: () => api.getJournals(tradeParams) });

  const paginated = (trades as any[]).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil((trades as any[]).length / PAGE_SIZE);

  const kpis = [
    { label: 'Tổng trades', value: stats?.total ?? '—' },
    { label: 'Win Rate', value: stats?.winRate != null ? `${stats.winRate}%` : '—', color: stats?.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
    { label: 'Avg R:R', value: stats?.avgRR ? `1:${stats.avgRR}` : '—', color: 'var(--accent)' },
    { label: 'Total P&L', value: stats?.totalPnl != null ? `$${stats.totalPnl.toFixed(2)}` : '—', color: (stats?.totalPnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: 'Max Drawdown', value: stats?.maxDrawdown != null ? `$${stats.maxDrawdown.toFixed(2)}` : '—', color: 'var(--red)' },
  ];

  // Build histogram from equity curve
  const histData = (stats?.equityCurve || []).map((p: any) => ({ date: p.date, pnl: p.pnl }));

  return (
    <div>
      {!studentId && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Reports Workbench</h2>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
            <Printer size={14} /> Print
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={filters.from} onChange={e => { setFilters({ from: e.target.value }); setPage(1); }} style={{ ...inputStyle, width: 150 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>đến</span>
        <input type="date" value={filters.to} onChange={e => { setFilters({ to: e.target.value }); setPage(1); }} style={{ ...inputStyle, width: 150 }} />
        <input value={filters.symbol} onChange={e => { setFilters({ symbol: e.target.value }); setPage(1); }} placeholder="Symbol..." style={{ ...inputStyle, width: 120 }} />
        <select value={filters.direction} onChange={e => { setFilters({ direction: e.target.value }); setPage(1); }} style={{ ...selectStyle, width: 120 }}>
          <option value="">Tất cả</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
        <select value={filters.status} onChange={e => { setFilters({ status: e.target.value }); setPage(1); }} style={{ ...selectStyle, width: 120 }}>
          <option value="">Tất cả</option>
          <option value="open">Mở</option>
          <option value="closed">Đóng</option>
        </select>
        {!studentId && (
          <select value={filters.account_id} onChange={e => { setFilters({ account_id: e.target.value }); setPage(1); }} style={{ ...selectStyle, width: 180 }}>
            <option value="">Tất cả Accounts</option>
            {(accounts as any[]).map((a: any) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
        <button onClick={() => { resetFilters(); setPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <KPIStrip kpis={kpis} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Equity Curve</h3>
          <EquityCurve data={stats?.equityCurve || []} height={180} />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>PnL Histogram</h3>
          {histData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={histData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: '#1e2230', border: '1px solid #2a2f3e', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`$${v.toFixed(2)}`, 'PnL']} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {histData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* Paginated table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
              {['Ngày', 'Symbol', 'Hướng', 'Entry', 'Exit', 'Lot', 'PnL', 'R:R', 'Cảm xúc', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có trade phù hợp</td></tr>
            ) : paginated.map((t: any) => (
              <tr key={t.id} onClick={() => setSelected(t)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={tds}>{t.date}</td>
                <td style={{ ...tds, fontWeight: 600 }}>{t.symbol || '—'}</td>
                <td style={{ ...tds, color: t.direction === 'long' ? 'var(--green)' : 'var(--red)' }}>{t.direction?.toUpperCase() || '—'}</td>
                <td style={tds}>{t.entry_price ?? '—'}</td>
                <td style={tds}>{t.exit_price ?? '—'}</td>
                <td style={tds}>{t.lot_size ?? '—'}</td>
                <td style={{ ...tds, color: (t.pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}${Number(t.pnl).toFixed(2)}$` : '—'}</td>
                <td style={{ ...tds, color: 'var(--accent)' }}>{t.rr_ratio ? `1:${t.rr_ratio}` : '—'}</td>
                <td style={tds}>{t.emotion || '—'}</td>
                <td style={tds}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: t.status === 'open' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.1)', color: t.status === 'open' ? 'var(--blue)' : 'var(--green)' }}>{t.status === 'open' ? 'Mở' : 'Đóng'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '14px', borderTop: '1px solid var(--border)' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: page === p ? 'var(--accent)' : 'var(--surface2)', color: page === p ? 'white' : 'var(--text)', cursor: 'pointer', fontSize: 13 }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {selected && <TradeDetailPanel trade={selected} onClose={() => setSelected(null)} readOnly={!!studentId} />}
    </div>
  );
}

const tds: React.CSSProperties = { padding: '10px 12px', fontSize: 13 };
