import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import EquityCurve from '../../components/EquityCurve';
import HeatmapCalendar from '../../components/HeatmapCalendar';
import PnlMonthCalendar from '../../components/PnlMonthCalendar';
import TradeDetailPanel from '../../components/TradeDetailPanel';
import { format, subDays } from 'date-fns';
import { TrendingUp, TrendingDown, Trophy, AlertCircle } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useThemeStore, CHART_COLORS } from '../../store/themeStore';

// Donut gauge for win rate
function WinGauge({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const pct = total ? wins / total : 0;
  const r = 42, cx = 52, cy = 52, strokeW = 9;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * pct;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={104} height={104} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(240,80,110,0.2)" strokeWidth={strokeW} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0506e" strokeWidth={strokeW}
          strokeDasharray={`${circumference * (1 - pct)} ${circumference * pct}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.8s' }} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10d98a" strokeWidth={strokeW}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.8s' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e8edf5" fontSize={15} fontWeight={800}>{wins}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#4a5c7a" fontSize={11}>{losses}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10d98a' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wins} thắng</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0506e' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{losses} thua</span>
        </div>
      </div>
    </div>
  );
}

// PF donut
function ProfitFactorGauge({ pf, gross_profit, gross_loss }: { pf: number; gross_profit: number; gross_loss: number }) {
  const total = gross_profit + gross_loss;
  const pct = total ? gross_profit / total : 0;
  const r = 42, cx = 52, cy = 52, strokeW = 9;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * pct;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={104} height={104} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(240,80,110,0.2)" strokeWidth={strokeW} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0506e" strokeWidth={strokeW}
          strokeDasharray={`${circumference * (1 - pct)} ${circumference * pct}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10d98a" strokeWidth={strokeW}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#e8edf5" fontSize={14} fontWeight={800}>{pf === 999 ? '∞' : pf.toFixed(2)}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10d98a' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>${gross_profit?.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f0506e' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>-${gross_loss?.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

// Multi-account checkbox dropdown
function AccountMultiSelect({ accounts, selected, onChange }: { accounts: any[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const label = selected.length === 0 ? 'Tất cả Accounts' : selected.length === 1 ? accounts.find(a => a.id === selected[0])?.name : `${selected.length} accounts`;
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, cursor: 'pointer', minWidth: 150 }}>
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 41, background: 'rgba(13,19,32,0.97)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, minWidth: 200, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}
              onClick={() => { onChange([]); setOpen(false); }}>
              <input type="checkbox" checked={selected.length === 0} readOnly style={{ accentColor: 'var(--accent)' }} /> Tất cả
            </label>
            {accounts.map((a: any) => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text)' }}>
                <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} style={{ accentColor: a.color || 'var(--accent)' }} />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                {a.name}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { filters, setFilters } = useFilters('dashboard', { range: '30', account_ids: '' });
  const [selected, setSelected] = useState<any>(null);

  const days = parseInt(filters.range);
  const from = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts() });
  const selectedIds: string[] = filters.account_ids ? filters.account_ids.split(',').filter(Boolean) : [];

  const statsParams: Record<string, string> = { from };
  if (selectedIds.length) statsParams.account_ids = selectedIds.join(',');
  const { data: stats } = useQuery({ queryKey: ['stats', from, filters.account_ids], queryFn: () => api.getStats(statsParams) });

  const journalParams: Record<string, string> = { type: 'idea' };
  if (selectedIds.length === 1) journalParams.account_id = selectedIds[0];
  const { data: trades = [] } = useQuery({ queryKey: ['journals', 'recent', filters.account_ids], queryFn: () => api.getJournals(journalParams) });

  const recent = (trades as any[]).slice(0, 8);
  const s = stats as any;
  const { mindTheme } = useThemeStore();
  const cc = CHART_COLORS[mindTheme];

  // Net daily pnl bar chart
  const netDailyData = (s?.heatmap || []).slice(-20).map((d: any) => ({ date: d.date.slice(5), pnl: d.pnl }));

  const card: React.CSSProperties = {
    background: 'rgba(19,19,19,0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '18px 20px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
  };
  const cardGlow: React.CSSProperties = {
    position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(71,159,250,0.18), transparent)',
  };

  return (
    <div className="font-avenir" style={{ position: 'relative' }}>
      {/* Animated ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '8%', left: '18%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,159,250,0.055) 0%, transparent 65%)', animation: 'orbDrift 18s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '12%', right: '14%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,190,150,0.04) 0%, transparent 65%)', animation: 'orbDrift 22s ease-in-out infinite reverse 4s' }} />
        <div style={{ position: 'absolute', top: '55%', left: '60%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(128,82,255,0.035) 0%, transparent 65%)', animation: 'orbDrift 26s ease-in-out infinite 8s' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em' }}>Dashboard</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Hiệu suất giao dịch tổng quan</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Multi-account filter */}
          {(accounts as any[]).length > 0 && (
            <AccountMultiSelect
              accounts={accounts as any[]}
              selected={selectedIds}
              onChange={ids => setFilters({ account_ids: ids.join(',') })}
            />
          )}
          {/* Range pills */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {[{ v: '7', l: 'WEEK' }, { v: '30', l: 'MONTH' }, { v: '90', l: '3M' }, { v: '365', l: 'YEAR' }].map(r => (
              <button key={r.v + r.l} onClick={() => setFilters({ range: r.v })}
                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', transition: 'all 0.15s', background: filters.range === r.v ? 'var(--btn)' : 'transparent', color: filters.range === r.v ? 'white' : 'var(--text-muted)' }}>
                {r.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row 1 — big cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Total P&L */}
        <div style={{ ...card }}>
          <div style={cardGlow} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Total P&L</div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.06em', color: (s?.totalPnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
            {s?.totalPnl != null ? `${s.totalPnl >= 0 ? '+' : ''}$${Math.abs(s.totalPnl).toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 16 }}>
            <span>Gross Profit: <span style={{ color: 'var(--green)' }}>${s?.grossProfit?.toFixed(2) ?? '0'}</span></span>
            <span>Gross Loss: <span style={{ color: 'var(--red)' }}>-${s?.grossLoss?.toFixed(2) ?? '0'}</span></span>
          </div>
        </div>

        {/* Win Rate donut */}
        <div style={{ ...card }}>
          <div style={cardGlow} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Trade Win %</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <WinGauge wins={s?.wins ?? 0} losses={s?.losses ?? 0} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', color: (s?.winRate ?? 0) >= 50 ? 'var(--green)' : 'var(--red)' }}>
                {s?.winRate != null ? `${s.winRate}%` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s?.total ?? 0} trades</div>
            </div>
          </div>
        </div>

        {/* Profit Factor donut */}
        <div style={{ ...card }}>
          <div style={cardGlow} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Profit Factor</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ProfitFactorGauge pf={s?.profitFactor ?? 0} gross_profit={s?.grossProfit ?? 0} gross_loss={s?.grossLoss ?? 0} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', color: (s?.profitFactor ?? 0) >= 1.5 ? 'var(--green)' : (s?.profitFactor ?? 0) >= 1 ? 'var(--yellow)' : 'var(--red)' }}>
                {s?.profitFactor != null ? (s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)) : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Avg R:R {s?.avgRR ? `1:${s.avgRR}` : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row 2 — smaller stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Avg Win', value: s?.avgWin != null ? `$${s.avgWin.toFixed(2)}` : '—', color: 'var(--green)' },
          { label: 'Avg Loss', value: s?.avgLoss != null ? `-$${s.avgLoss.toFixed(2)}` : '—', color: 'var(--red)' },
          { label: 'Max Drawdown', value: s?.maxDrawdown != null ? `$${s.maxDrawdown.toFixed(2)}` : '—', color: 'var(--red)' },
          { label: 'Total Trades', value: s?.total ?? '—', color: 'var(--text)' },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: '14px 16px' }}>
            <div style={cardGlow} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, letterSpacing: '-0.04em' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Best / Worst Trade */}
      {(s?.bestTrade || s?.worstTrade) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {s?.bestTrade && (
            <div style={{ ...card, borderColor: 'rgba(16,217,138,0.2)', background: 'rgba(16,217,138,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Trophy size={13} color="var(--green)" />
                    <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Trade</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)', letterSpacing: '-0.05em' }}>+${s.bestTrade.pnl?.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{s.bestTrade.symbol || '—'}</div>
                  <div>{s.bestTrade.direction?.toUpperCase()} {s.bestTrade.lot_size ? `${s.bestTrade.lot_size} lot` : ''}</div>
                  <div>{s.bestTrade.date}</div>
                </div>
              </div>
            </div>
          )}
          {s?.worstTrade && (
            <div style={{ ...card, borderColor: 'rgba(240,80,110,0.2)', background: 'rgba(240,80,110,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <AlertCircle size={13} color="var(--red)" />
                    <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Worst Trade</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--red)', letterSpacing: '-0.05em' }}>${s.worstTrade.pnl?.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{s.worstTrade.symbol || '—'}</div>
                  <div>{s.worstTrade.direction?.toUpperCase()} {s.worstTrade.lot_size ? `${s.worstTrade.lot_size} lot` : ''}</div>
                  <div>{s.worstTrade.date}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Equity curve */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontFamily: "'Montserrat',sans-serif" }}>Daily Net Cumulative P&L</div>
          <EquityCurve data={s?.equityCurve || []} height={200} />
        </div>

        {/* Net daily PnL bars */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontFamily: "'Montserrat',sans-serif" }}>Net Daily P&L</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={netDailyData} barSize={10}>
              <XAxis dataKey="date" tick={{ fill: '#555a60', fontSize: 9, fontFamily: 'Montserrat' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555a60', fontSize: 9, fontFamily: 'Montserrat' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#868f97', fontFamily: 'Montserrat', fontSize: 11 }}
                itemStyle={{ color: '#e6e6e6', fontFamily: 'Montserrat', fontWeight: 600 }}
                formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'P&L']}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {netDailyData.map((_: any, i: number) => (
                  <Cell key={i} fill={netDailyData[i]?.pnl >= 0 ? cc.profit : cc.loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly PnL Calendar — full grid */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontFamily: "'Montserrat',sans-serif" }}>PnL Calendar</div>
        <PnlMonthCalendar data={s?.heatmap || []} />
      </div>

      {/* Heatmap + Recent trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ ...card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontFamily: "'Montserrat',sans-serif" }}>Activity Heatmap</div>
          <HeatmapCalendar data={s?.heatmap || []} />
        </div>

        {/* Recent trades table */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, fontFamily: "'Montserrat',sans-serif" }}>Trades gần đây</div>
          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 13 }}>Chưa có trade nào</div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 260 }}>
              {recent.map((t: any) => (
                <div key={t.id} onClick={() => setSelected(t)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: t.pnl >= 0 ? 'rgba(16,217,138,0.1)' : 'rgba(240,80,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.direction === 'long' ? <TrendingUp size={14} color="var(--green)" /> : <TrendingDown size={14} color="var(--red)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t.symbol || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.date} · {t.direction?.toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: (t.pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)', letterSpacing: '-0.02em' }}>
                      {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(2)}` : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.rr_ratio ? `1:${t.rr_ratio}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && <TradeDetailPanel trade={selected} onClose={() => setSelected(null)} readOnly />}
      </div>{/* /zIndex wrapper */}
    </div>
  );
}
