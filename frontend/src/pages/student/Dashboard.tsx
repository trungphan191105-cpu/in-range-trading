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

const GREEN = '#5fd6a4';
const RED = '#ef8b78';

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
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${RED}33`} strokeWidth={strokeW} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={RED} strokeWidth={strokeW}
          strokeDasharray={`${circumference * (1 - pct)} ${circumference * pct}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.8s' }} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={GREEN} strokeWidth={strokeW}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.8s' }} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#f3f3f3" fontSize={15} fontWeight={800}>{wins}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="rgba(180,180,180,0.3)" fontSize={11}>{losses}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
          <span style={{ fontSize: 11, color: 'rgba(210,210,210,0.5)' }}>{wins} thắng</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
          <span style={{ fontSize: 11, color: 'rgba(210,210,210,0.5)' }}>{losses} thua</span>
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
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${RED}33`} strokeWidth={strokeW} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={RED} strokeWidth={strokeW}
          strokeDasharray={`${circumference * (1 - pct)} ${circumference * pct}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={GREEN} strokeWidth={strokeW}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#f3f3f3" fontSize={14} fontWeight={800}>{pf === 999 ? '∞' : pf.toFixed(2)}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
          <span style={{ fontSize: 11, color: 'rgba(210,210,210,0.5)' }}>${gross_profit?.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
          <span style={{ fontSize: 11, color: 'rgba(210,210,210,0.5)' }}>-${gross_loss?.toFixed(0)}</span>
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
      <button type="button" onClick={() => setOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.085)', background: 'rgba(20,21,23,0.42)', backdropFilter: 'blur(20px) saturate(125%)', WebkitBackdropFilter: 'blur(20px) saturate(125%)', color: '#f3f3f3', fontSize: 12, cursor: 'pointer', minWidth: 150 }}>
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 41, background: 'rgba(16,17,19,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 10, padding: 6, minWidth: 200, boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'rgba(210,210,210,0.5)' }}
              onClick={() => { onChange([]); setOpen(false); }}>
              <input type="checkbox" checked={selected.length === 0} readOnly style={{ accentColor: GREEN }} /> Tất cả
            </label>
            {accounts.map((a: any) => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#f3f3f3' }}>
                <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} style={{ accentColor: a.color || GREEN }} />
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
  const [showEquity, setShowEquity] = useState(true);
  const [showNetDaily, setShowNetDaily] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);

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
    background: 'rgba(20,21,23,0.42)',
    backdropFilter: 'blur(20px) saturate(125%)',
    WebkitBackdropFilter: 'blur(20px) saturate(125%)',
    border: '1px solid rgba(255,255,255,0.085)',
    borderRadius: 16,
    padding: '18px 20px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
  };
  const cardGlow: React.CSSProperties = {
    position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(95,214,164,0.15), transparent)',
  };

  return (
    <div className="font-avenir" style={{ position: 'relative' }}>
      {/* Animated ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '8%', left: '18%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,214,164,0.04) 0%, transparent 65%)', animation: 'orbDrift 18s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '12%', right: '14%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,190,150,0.03) 0%, transparent 65%)', animation: 'orbDrift 22s ease-in-out infinite reverse 4s' }} />
        <div style={{ position: 'absolute', top: '55%', left: '60%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(128,82,255,0.025) 0%, transparent 65%)', animation: 'orbDrift 26s ease-in-out infinite 8s' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(220,220,220,0.42)', textTransform: 'uppercase', marginBottom: 6 }}>OVERVIEW</div>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', color: '#f3f3f3' }}>Dashboard</h2>
          <p style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)', marginTop: 2 }}>Hiệu suất giao dịch tổng quan</p>
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
          <div style={{ display: 'flex', gap: 4, background: 'rgba(20,21,23,0.42)', backdropFilter: 'blur(20px) saturate(125%)', WebkitBackdropFilter: 'blur(20px) saturate(125%)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 10, padding: 3 }}>
            {[{ v: '7', l: 'WEEK' }, { v: '30', l: 'MONTH' }, { v: '90', l: '3M' }, { v: '365', l: 'YEAR' }].map(r => (
              <button key={r.v + r.l} onClick={() => setFilters({ range: r.v })}
                style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', transition: 'all 0.15s', background: filters.range === r.v ? 'rgba(95,214,164,0.15)' : 'transparent', color: filters.range === r.v ? GREEN : 'rgba(210,210,210,0.5)' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(205,205,205,0.42)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Daily Net Cumulative P&L</div>
              <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.06em', color: (s?.totalPnl ?? 0) >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums' }}>
                {s?.totalPnl != null ? `${s.totalPnl >= 0 ? '+' : ''}$${Math.abs(s.totalPnl).toLocaleString('en', { minimumFractionDigits: 2 })}` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(210,210,210,0.5)', marginTop: 8, display: 'flex', gap: 16 }}>
                <span>Profit: <span style={{ color: GREEN }}>${s?.grossProfit?.toFixed(2) ?? '0'}</span></span>
                <span>Loss: <span style={{ color: RED }}>-${s?.grossLoss?.toFixed(2) ?? '0'}</span></span>
              </div>
            </div>
            {netDailyData.length >= 2 && (() => {
              const vals = netDailyData.map((d: any) => d.pnl);
              const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
              const W = 100, H = 44;
              const pts = vals.map((v: number, i: number) => {
                const x = (i / (vals.length - 1)) * W;
                const y = H - ((v - min) / range) * (H - 4) - 2;
                return `${x},${y}`;
              });
              const path = `M${pts.join(' L')}`;
              const fill = `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
              const lineColor = (s?.totalPnl ?? 0) >= 0 ? GREEN : RED;
              return (
                <svg width={W} height={H} style={{ flexShrink: 0, overflow: 'visible', marginLeft: 12, alignSelf: 'center' }}>
                  <defs>
                    <linearGradient id="pnl-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={fill} fill="url(#pnl-grad)" />
                  <path d={path} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Win Rate donut */}
        <div style={{ ...card }}>
          <div style={cardGlow} />
          <div style={{ fontSize: 11, color: 'rgba(205,205,205,0.42)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Trade Win %</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <WinGauge wins={s?.wins ?? 0} losses={s?.losses ?? 0} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', color: (s?.winRate ?? 0) >= 50 ? GREEN : RED }}>
                {s?.winRate != null ? `${s.winRate}%` : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(210,210,210,0.5)', marginTop: 4 }}>{s?.total ?? 0} trades</div>
            </div>
          </div>
        </div>

        {/* Profit Factor donut */}
        <div style={{ ...card }}>
          <div style={cardGlow} />
          <div style={{ fontSize: 11, color: 'rgba(205,205,205,0.42)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Profit Factor</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ProfitFactorGauge pf={s?.profitFactor ?? 0} gross_profit={s?.grossProfit ?? 0} gross_loss={s?.grossLoss ?? 0} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.05em', color: (s?.profitFactor ?? 0) >= 1.5 ? GREEN : (s?.profitFactor ?? 0) >= 1 ? '#FBBF24' : RED }}>
                {s?.profitFactor != null ? (s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)) : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(210,210,210,0.5)', marginTop: 4 }}>Avg R:R {s?.avgRR ? `1:${s.avgRR}` : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row 2 — smaller stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Avg Win', value: s?.avgWin != null ? `$${s.avgWin.toFixed(2)}` : '—', color: GREEN },
          { label: 'Avg Loss', value: s?.avgLoss != null ? `-$${s.avgLoss.toFixed(2)}` : '—', color: RED },
          { label: 'Max Drawdown', value: s?.maxDrawdown != null ? `$${s.maxDrawdown.toFixed(2)}` : '—', color: RED },
          { label: 'Total Trades', value: s?.total ?? '—', color: '#f3f3f3' },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: '14px 16px' }}>
            <div style={cardGlow} />
            <div style={{ fontSize: 10, color: 'rgba(205,205,205,0.42)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, letterSpacing: '-0.04em' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Best / Worst Trade */}
      {(s?.bestTrade || s?.worstTrade) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {s?.bestTrade && (
            <div style={{ ...card, borderColor: `rgba(95,214,164,0.2)`, background: 'rgba(95,214,164,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Trophy size={13} color={GREEN} />
                    <span style={{ fontSize: 11, color: GREEN, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best Trade</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: GREEN, letterSpacing: '-0.05em' }}>+${s.bestTrade.pnl?.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(210,210,210,0.5)' }}>
                  <div style={{ fontWeight: 700, color: '#f3f3f3', marginBottom: 2 }}>{s.bestTrade.symbol || '—'}</div>
                  <div>{s.bestTrade.direction?.toUpperCase()} {s.bestTrade.lot_size ? `${s.bestTrade.lot_size} lot` : ''}</div>
                  <div>{s.bestTrade.date}</div>
                </div>
              </div>
            </div>
          )}
          {s?.worstTrade && (
            <div style={{ ...card, borderColor: `rgba(239,139,120,0.2)`, background: 'rgba(239,139,120,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <AlertCircle size={13} color={RED} />
                    <span style={{ fontSize: 11, color: RED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Worst Trade</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: RED, letterSpacing: '-0.05em' }}>${s.worstTrade.pnl?.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(210,210,210,0.5)' }}>
                  <div style={{ fontWeight: 700, color: '#f3f3f3', marginBottom: 2 }}>{s.worstTrade.symbol || '—'}</div>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showEquity ? 14 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(180,180,180,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Equity Curve</div>
            <button onClick={() => setShowEquity(v => !v)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', color: 'rgba(210,210,210,0.5)', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.13s' }}>
              {showEquity ? '▲ Thu gọn' : '▼ Mở rộng'}
            </button>
          </div>
          {showEquity && <EquityCurve data={s?.equityCurve || []} height={200} />}
        </div>

        {/* Net daily PnL bars */}
        <div style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showNetDaily ? 14 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(180,180,180,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Net Daily P&L</div>
            <button onClick={() => setShowNetDaily(v => !v)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', color: 'rgba(210,210,210,0.5)', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.13s' }}>
              {showNetDaily ? '▲ Thu gọn' : '▼ Mở rộng'}
            </button>
          </div>
          {showNetDaily && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={netDailyData} barSize={10}>
                <XAxis dataKey="date" tick={{ fill: 'rgba(180,180,180,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(180,180,180,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: 'rgba(16,17,19,0.97)', border: '1px solid rgba(255,255,255,0.085)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(210,210,210,0.5)', fontSize: 11 }}
                  itemStyle={{ color: '#f3f3f3', fontWeight: 600 }}
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
          )}
        </div>
      </div>

      {/* Monthly PnL Calendar — scrollable */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showCalendar ? 14 : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(180,180,180,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>PnL Calendar</div>
          <button onClick={() => setShowCalendar(v => !v)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', color: 'rgba(210,210,210,0.5)', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.13s' }}>
            {showCalendar ? '▲ Thu gọn' : '▼ Mở rộng'}
          </button>
        </div>
        {showCalendar && (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 420 }}>
            <PnlMonthCalendar data={s?.heatmap || []} />
          </div>
        )}
      </div>

      {/* Heatmap + Recent trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ ...card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(180,180,180,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Activity Heatmap</div>
          <HeatmapCalendar data={s?.heatmap || []} />
        </div>

        {/* Recent trades table */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(180,180,180,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Trades gần đây</div>
          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(210,210,210,0.5)', padding: '40px 0', fontSize: 13 }}>Chưa có trade nào</div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 260 }}>
              {recent.map((t: any) => (
                <div key={t.id} onClick={() => setSelected(t)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: t.pnl >= 0 ? `${GREEN}18` : `${RED}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.direction === 'long' ? <TrendingUp size={14} color={GREEN} /> : <TrendingDown size={14} color={RED} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f3f3f3' }}>{t.symbol || '—'}</div>
                    <div style={{ fontSize: 10, color: 'rgba(210,210,210,0.5)' }}>{t.date} · {t.direction?.toUpperCase()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: (t.pnl ?? 0) >= 0 ? GREEN : RED, letterSpacing: '-0.02em' }}>
                      {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(2)}` : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(210,210,210,0.5)' }}>{t.rr_ratio ? `1:${t.rr_ratio}` : ''}</div>
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
