/**
 * Reports Workbench — Glass Coal Design
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../../lib/api';
import TradeDetailPanel from '../../components/TradeDetailPanel';
import { EmotionChip } from '../../components/EmotionBall';
import { useFilters } from '../../hooks/useFilters';
import { RotateCcw, TrendingUp, Activity, Target, Search, Filter, Printer } from 'lucide-react';
import { inputStyle, selectStyle } from '../../components/Modal';
import { useQueryClient } from '@tanstack/react-query';

const PAGE_SIZE = 12;
const MINT  = '#5fd6a4';
const ROSE  = '#ef8b78';
const BLUE  = '#60A5FA';

const CARD: React.CSSProperties = {
  background: 'rgba(20,21,23,0.42)',
  backdropFilter: 'blur(20px) saturate(125%)',
  WebkitBackdropFilter: 'blur(20px) saturate(125%)',
  border: '1px solid rgba(255,255,255,0.085)',
  borderRadius: 16,
  boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};


const tds: React.CSSProperties = {
  padding: '11px 14px', fontSize: 12, color: 'rgba(210,210,210,0.7)', whiteSpace: 'nowrap',
};

export default function Reports({ studentId }: { studentId?: string }) {
  const qc = useQueryClient();
  const { filters, setFilters, resetFilters } = useFilters('reports' + (studentId || ''), {
    from: '', to: '', symbol: '', direction: '', status: '', account_id: '',
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'], queryFn: () => api.getAccounts(), enabled: !studentId,
  });

  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (studentId) params.studentId = studentId;
  if (filters.account_id) params.account_id = filters.account_id;

  const tradeParams: Record<string, string> = { type: 'idea', ...params };
  if (filters.symbol) tradeParams.symbol = filters.symbol;
  if (filters.direction) tradeParams.direction = filters.direction;
  if (filters.status) tradeParams.status = filters.status;

  const { data: stats } = useQuery({
    queryKey: ['stats', params, studentId], queryFn: () => api.getStats(params),
  });
  const { data: trades = [] } = useQuery({
    queryKey: ['journals', 'reports', tradeParams], queryFn: () => api.getJournals(tradeParams),
  });

  const allTrades = trades as any[];
  const paginated = allTrades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(allTrades.length / PAGE_SIZE);

  const equityCurve = (stats?.equityCurve || []) as any[];
  const histData = equityCurve.map((p: any) => ({ date: p.date, pnl: p.pnl }));

  const kpis = [
    {
      label: 'Total Trades', value: stats?.total ?? '—', icon: <Activity size={16} />,
      color: 'rgba(210,210,210,0.7)', sub: `${allTrades.filter(t => t.status === 'open').length} open`,
    },
    {
      label: 'Win Rate', value: stats?.winRate != null ? `${stats.winRate}%` : '—', icon: <Target size={16} />,
      color: (stats?.winRate ?? 0) >= 50 ? MINT : ROSE,
      sub: (stats?.winRate ?? 0) >= 50 ? 'Positive edge' : 'Below breakeven',
    },
    {
      label: 'Avg R:R', value: stats?.avgRR ? `1:${stats.avgRR}` : '—', icon: <TrendingUp size={16} />,
      color: BLUE, sub: 'Per closed trade',
    },
    {
      label: 'Total P&L', value: stats?.totalPnl != null ? `${stats.totalPnl >= 0 ? '+' : ''}$${Math.abs(stats.totalPnl).toFixed(2)}` : '—', icon: <TrendingUp size={16} />,
      color: (stats?.totalPnl ?? 0) >= 0 ? MINT : ROSE,
      sub: `Max DD $${Math.abs(stats?.maxDrawdown ?? 0).toFixed(2)}`,
    },
  ];

  const filterInput: React.CSSProperties = { ...inputStyle, height: 34, fontSize: 11, borderRadius: 9 };
  const filterSelect: React.CSSProperties = { ...selectStyle, height: 34, fontSize: 11, borderRadius: 9, width: 'auto' };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {!studentId && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(220,220,220,0.42)', textTransform: 'uppercase', marginBottom: 6 }}>ANALYTICS</div>
            <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', color: '#f3f3f3' }}>Reports Workbench</h2>
          </div>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.13)', background: 'rgba(28,29,31,0.6)', backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', color: 'rgba(210,210,210,0.7)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <Printer size={13} /> Print
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div style={{ ...CARD, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={12} color="rgba(205,205,205,0.42)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filters</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="date" value={filters.from} onChange={e => { setFilters({ from: e.target.value }); setPage(1); }} style={{ ...filterInput, width: 140 }} />
            <span style={{ fontSize: 11, color: 'rgba(180,180,180,0.3)' }}>→</span>
            <input type="date" value={filters.to} onChange={e => { setFilters({ to: e.target.value }); setPage(1); }} style={{ ...filterInput, width: 140 }} />
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={11} style={{ position: 'absolute', left: 9, color: 'rgba(205,205,205,0.42)', pointerEvents: 'none' }} />
            <input value={filters.symbol} onChange={e => { setFilters({ symbol: e.target.value }); setPage(1); }} placeholder="Symbol…" style={{ ...filterInput, width: 110, paddingLeft: 26 }} />
          </div>

          <select value={filters.direction} onChange={e => { setFilters({ direction: e.target.value }); setPage(1); }} style={filterSelect}>
            <option value="">Direction</option>
            <option value="long">↑ Long</option>
            <option value="short">↓ Short</option>
          </select>

          <select value={filters.status} onChange={e => { setFilters({ status: e.target.value }); setPage(1); }} style={filterSelect}>
            <option value="">Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          {!studentId && (
            <select value={filters.account_id} onChange={e => { setFilters({ account_id: e.target.value }); setPage(1); }} style={{ ...filterSelect, maxWidth: 180 }}>
              <option value="">All Accounts</option>
              {(accounts as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          <button onClick={() => { resetFilters(); setPage(1); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.085)', background: 'rgba(255,255,255,0.04)', color: 'rgba(205,205,205,0.42)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            <RotateCcw size={11} /> Reset
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{ ...CARD, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${kpi.color}33, transparent)` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{kpi.label}</div>
              <div style={{ color: kpi.color, opacity: 0.6 }}>{kpi.icon}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: kpi.color, letterSpacing: '-0.05em', textShadow: `0 0 16px ${kpi.color}22` }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 10, color: 'rgba(205,205,205,0.42)', marginTop: 5 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Equity Curve */}
        <div style={{ ...CARD, padding: '18px 20px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Equity Curve — Daily Cumulative P&L</div>
          {equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={equityCurve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={MINT} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={MINT} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(205,205,205,0.42)', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(205,205,205,0.42)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={54} />
                <Tooltip
                  contentStyle={{ background: 'rgba(16,17,19,0.97)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 10, fontSize: 11, color: '#f3f3f3' }}
                  formatter={(v) => ['$' + Number(v).toFixed(2), 'Equity']}
                />
                <Area type="monotone" dataKey="equity" stroke={MINT} strokeWidth={1.8} fill="url(#eqGrad)" dot={false} />
              </AreaChart>

            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,180,180,0.3)', fontSize: 12 }}>No data yet</div>
          )}
        </div>

        {/* PnL Histogram */}
        <div style={{ ...CARD, padding: '18px 20px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Daily P&L — Wins and Losses</div>
          {histData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={histData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(205,205,205,0.42)', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(205,205,205,0.42)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} width={54} />
                <Tooltip
                  contentStyle={{ background: 'rgba(16,17,19,0.97)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 10, fontSize: 11, color: '#f3f3f3' }}
                  formatter={(v) => ['$' + Number(v).toFixed(2), 'P&L']}
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {histData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? MINT : ROSE} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (

            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,180,180,0.3)', fontSize: 12 }}>No data yet</div>
          )}
        </div>
      </div>

      {/* ── Transactions table ── */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Transactions — {allTrades.length} trades
          </div>
          {allTrades.length > PAGE_SIZE && (
            <div style={{ fontSize: 10, color: 'rgba(180,180,180,0.3)' }}>Page {page} of {totalPages}</div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Date', 'Symbol', 'Direction', 'Entry', 'Exit', 'Lot', 'P&L', 'R:R', 'Emotion', 'Status'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 0', textAlign: 'center', color: 'rgba(180,180,180,0.3)', fontSize: 13 }}>No trades match the current filters</td>
                </tr>
              ) : paginated.map((t: any) => {
                const pnl = Number(t.pnl ?? 0);
                const pos = pnl >= 0;
                return (
                  <tr key={t.id} onClick={() => setSelected(t)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{t.date}</td>
                    <td style={{ ...tds, fontWeight: 700, color: '#f3f3f3' }}>{t.symbol || '—'}</td>
                    <td style={tds}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, border: `1px solid ${t.direction === 'long' ? 'rgba(95,214,164,0.35)' : 'rgba(239,139,120,0.35)'}`, color: t.direction === 'long' ? MINT : ROSE, letterSpacing: '0.06em' }}>
                        {t.direction === 'long' ? '↑ LONG' : t.direction === 'short' ? '↓ SHORT' : '—'}
                      </span>
                    </td>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{t.entry_price ?? '—'}</td>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{t.exit_price ?? '—'}</td>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)' }}>{t.lot_size ?? '—'}</td>
                    <td style={{ ...tds, fontWeight: 700, color: t.pnl != null ? (pos ? MINT : ROSE) : 'rgba(205,205,205,0.42)', textShadow: t.pnl != null ? `0 0 10px ${pos ? MINT : ROSE}33` : 'none' }}>
                      {t.pnl != null ? `${pos ? '+' : ''}$${Math.abs(pnl).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...tds, color: BLUE }}>{t.rr_ratio ? `1:${t.rr_ratio}` : '—'}</td>
                    <td style={tds}>
                      {t.emotion ? <EmotionChip emotionId={t.emotion} /> : <span style={{ color: 'rgba(180,180,180,0.3)' }}>—</span>}
                    </td>
                    <td style={tds}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, border: `1px solid ${t.status === 'open' ? 'rgba(96,165,250,0.3)' : 'rgba(95,214,164,0.3)'}`, color: t.status === 'open' ? BLUE : MINT }}>
                        {t.status === 'open' ? 'OPEN' : 'CLOSED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 4, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', justifyContent: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${page === p ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`, background: page === p ? 'rgba(255,255,255,0.09)' : 'transparent', color: page === p ? '#f3f3f3' : 'rgba(205,205,205,0.42)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TradeDetailPanel
          trade={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {}}
          onDelete={() => { setSelected(null); }}
          onToggleStatus={async (t: any) => {
            await api.updateJournal(t.id, { status: t.status === 'open' ? 'closed' : 'open' });
            qc.invalidateQueries({ queryKey: ['journals'] }); setSelected(null);
          }}
        />
      )}
    </div>
  );
}
 + Number(v).toFixed(2), 'Equity']}
                />
                <Area type="monotone" dataKey="equity" stroke={MINT} strokeWidth={1.8} fill="url(#eqGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,180,180,0.3)', fontSize: 12 }}>No data yet</div>
          )}
        </div>

        {/* PnL Histogram */}
        <div style={{ ...CARD, padding: '18px 20px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Daily P&L — Wins and Losses</div>
          {histData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={histData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(205,205,205,0.42)', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(205,205,205,0.42)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={54} />
                <Tooltip
                  contentStyle={{ background: 'rgba(16,17,19,0.97)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 10, fontSize: 11, color: '#f3f3f3' }}
                  formatter={(v) => [`${Number(v).toFixed(2)}`, 'P&L']}
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {histData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? MINT : ROSE} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,180,180,0.3)', fontSize: 12 }}>No data yet</div>
          )}
        </div>
      </div>

      {/* ── Transactions table ── */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Transactions — {allTrades.length} trades
          </div>
          {allTrades.length > PAGE_SIZE && (
            <div style={{ fontSize: 10, color: 'rgba(180,180,180,0.3)' }}>Page {page} of {totalPages}</div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Date', 'Symbol', 'Direction', 'Entry', 'Exit', 'Lot', 'P&L', 'R:R', 'Emotion', 'Status'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 0', textAlign: 'center', color: 'rgba(180,180,180,0.3)', fontSize: 13 }}>No trades match the current filters</td>
                </tr>
              ) : paginated.map((t: any) => {
                const pnl = Number(t.pnl ?? 0);
                const pos = pnl >= 0;
                return (
                  <tr key={t.id} onClick={() => setSelected(t)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{t.date}</td>
                    <td style={{ ...tds, fontWeight: 700, color: '#f3f3f3' }}>{t.symbol || '—'}</td>
                    <td style={tds}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, border: `1px solid ${t.direction === 'long' ? 'rgba(95,214,164,0.35)' : 'rgba(239,139,120,0.35)'}`, color: t.direction === 'long' ? MINT : ROSE, letterSpacing: '0.06em' }}>
                        {t.direction === 'long' ? '↑ LONG' : t.direction === 'short' ? '↓ SHORT' : '—'}
                      </span>
                    </td>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{t.entry_price ?? '—'}</td>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{t.exit_price ?? '—'}</td>
                    <td style={{ ...tds, color: 'rgba(210,210,210,0.5)' }}>{t.lot_size ?? '—'}</td>
                    <td style={{ ...tds, fontWeight: 700, color: t.pnl != null ? (pos ? MINT : ROSE) : 'rgba(205,205,205,0.42)', textShadow: t.pnl != null ? `0 0 10px ${pos ? MINT : ROSE}33` : 'none' }}>
                      {t.pnl != null ? `${pos ? '+' : ''}$${Math.abs(pnl).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...tds, color: BLUE }}>{t.rr_ratio ? `1:${t.rr_ratio}` : '—'}</td>
                    <td style={tds}>
                      {t.emotion ? <EmotionChip emotionId={t.emotion} /> : <span style={{ color: 'rgba(180,180,180,0.3)' }}>—</span>}
                    </td>
                    <td style={tds}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, border: `1px solid ${t.status === 'open' ? 'rgba(96,165,250,0.3)' : 'rgba(95,214,164,0.3)'}`, color: t.status === 'open' ? BLUE : MINT }}>
                        {t.status === 'open' ? 'OPEN' : 'CLOSED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 4, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', justifyContent: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${page === p ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`, background: page === p ? 'rgba(255,255,255,0.09)' : 'transparent', color: page === p ? '#f3f3f3' : 'rgba(205,205,205,0.42)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TradeDetailPanel
          trade={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {}}
          onDelete={() => { setSelected(null); }}
          onToggleStatus={async (t: any) => {
            await api.updateJournal(t.id, { status: t.status === 'open' ? 'closed' : 'open' });
            qc.invalidateQueries({ queryKey: ['journals'] }); setSelected(null);
          }}
        />
      )}
    </div>
  );
}
