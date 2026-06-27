/**
 * DayPerformanceModal — TraderSync-style daily/weekly view
 * Shows equity curve + trade table for a selected day or week
 */
import { useQuery } from '@tanstack/react-query';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../lib/api';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  date: string;      // 'yyyy-MM-dd'
  isWeek?: boolean;  // Saturday column → weekly view
  weekNumber?: number;
  onClose: () => void;
}

function fmt$(v: number) {
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v >= 0 ? '+$' : '-$') + abs;
}

export default function DayPerformanceModal({ date, isWeek, onClose }: Props) {
  // For weekly: get Mon-Fri of that week
  const d = new Date(date + 'T12:00:00');
  const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd   = format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const queryDate = isWeek ? undefined : date;
  const queryFrom = isWeek ? weekStart : undefined;
  const queryTo   = isWeek ? weekEnd   : undefined;


  const params: Record<string,string> = { type: 'idea' };
  if (queryDate) { params.from = queryDate; params.to = queryDate; }
  if (queryFrom) { params.from = queryFrom; params.to = queryTo!; }

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['day-perf', date, isWeek],
    queryFn: () => api.getJournals(params),
  });

  const list: any[] = Array.isArray(trades) ? trades : (trades as any)?.entries ?? [];

  // Sort by id/created_at (assume chronological order)
  const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build cumulative equity curve
  let cumPnl = 0;
  const curve = sorted.map((t, i) => {
    cumPnl += Number(t.pnl ?? 0);
    return { label: t.symbol || `Trade ${i + 1}`, pnl: cumPnl };
  });

  const totalPnl = sorted.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);
  const pos = totalPnl >= 0;
  const lineColor = pos ? '#4ebe96' : '#c8746a';

  const title = isWeek
    ? `Week Performance: ${format(new Date(weekStart + 'T12:00:00'), 'MM/dd/yy')} – ${format(new Date(weekEnd + 'T12:00:00'), 'MM/dd/yy')}`
    : `Day Performance: ${format(d, 'MM/dd/yy')}`;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(4px)' }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: '90vw', maxWidth: 900, maxHeight: '88vh',
        background: 'rgba(13,13,13,0.98)', backdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18, zIndex: 201, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 120px rgba(0,0,0,0.9)',
        animation: 'scaleIn 0.22s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#479ffa', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
              {isWeek ? 'Weekly Summary' : 'Daily Summary'}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e6e6e6', letterSpacing: '-0.04em', margin: 0 }}>{title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#868f97', marginBottom: 2 }}>Total P&L</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: lineColor, letterSpacing: '-0.05em', textShadow: `0 0 16px ${pos ? 'rgba(78,190,150,0.4)' : 'rgba(200,116,106,0.4)'}` }}>
                {fmt$(totalPnl)}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#868f97', transition: 'all 0.2s' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: '#868f97', padding: '60px 0' }}>Loading…</div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
              <div style={{ color: '#868f97', fontSize: 14 }}>No trades recorded for this {isWeek ? 'week' : 'day'}.</div>
            </div>
          ) : (
            <>
              {/* Equity curve */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#868f97', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Cumulative P&L
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={curve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="1 6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} width={54}
                      tickFormatter={v => `$${v.toFixed(0)}`} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(13,13,13,0.96)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [fmt$(v), 'Cumulative']}
                    />
                    <Area type="monotone" dataKey="pnl" stroke={lineColor} strokeWidth={1.8} fill="url(#dayGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Trade table */}
              <div style={{ fontSize: 10, fontWeight: 600, color: '#868f97', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Trades ({list.length})
              </div>
              <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {['Symbol','Direction','Entry','Exit','Lot','P&L','R:R','Emotion'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#555a60', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((t, i) => {
                      const tp = Number(t.pnl ?? 0);
                      const tpos = tp >= 0;
                      return (
                        <tr key={t.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={td}><span style={{ fontWeight: 600, color: '#cccccc', letterSpacing: '0.04em' }}>{t.symbol || '—'}</span></td>
                          <td style={td}>
                            {t.direction && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, border: `1px solid ${t.direction === 'long' ? 'rgba(78,190,150,0.4)' : 'rgba(200,116,106,0.4)'}`, color: t.direction === 'long' ? '#4ebe96' : '#c8746a' }}>
                                {t.direction === 'long' ? <TrendingUp size={8} /> : <TrendingDown size={8} />} {t.direction.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td style={td}>{t.entry_price ?? '—'}</td>
                          <td style={td}>{t.exit_price ?? '—'}</td>
                          <td style={td}>{t.lot_size ?? '—'}</td>
                          <td style={{ ...td, fontWeight: 700, color: tpos ? '#4ebe96' : '#c8746a', letterSpacing: '-0.02em' }}>
                            {tp !== 0 ? fmt$(tp) : '—'}
                          </td>
                          <td style={{ ...td, color: '#479ffa' }}>{t.rr_ratio ? `1:${t.rr_ratio}` : '—'}</td>
                          <td style={td}><span style={{ fontSize: 11 }}>{t.emotion || '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const td: React.CSSProperties = { padding: '9px 12px', fontSize: 12, color: '#868f97', whiteSpace: 'nowrap' };
