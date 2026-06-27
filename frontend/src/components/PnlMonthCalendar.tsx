/**
 * PnL Monthly Calendar — TraderSync-style full grid
 * Mo-Su columns · weekly sums in Saturday column · today highlighted
 * Click any day/week cell → DayPerformanceModal
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, isSameMonth, isSameDay, addMonths, subMonths,
} from 'date-fns';
import DayPerformanceModal from './DayPerformanceModal';

interface DayPnl { date: string; pnl: number; count?: number; }

const DOW = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function fmt$(v: number) {
  if (v === 0) return '$0.00';
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v > 0 ? '+' : '-') + '$' + abs;
}

export default function PnlMonthCalendar({ data }: { data: DayPnl[] }) {
  const [current, setCurrent] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<{ date: string; isWeek: boolean } | null>(null);
  const today = new Date();

  const pnlMap = useMemo(() => {
    const m: Record<string, { pnl: number; count: number }> = {};
    for (const d of data) m[d.date] = { pnl: Number(d.pnl), count: d.count ?? 0 };
    return m;
  }, [data]);

  // Build 6-row × 7-col grid (Mon-first)
  const firstDay = startOfMonth(current);
  const lastDay = endOfMonth(current);
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });

  // Monday=0 offset
  const startOffset = (getDay(firstDay) + 6) % 7; // 0=Mon … 6=Sun

  const cells: (Date | null)[] = [...Array(startOffset).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  // Weekly sums (Mon-Fri = col 0-4)
  const weekSums = rows.map(row => {
    let sum = 0, cnt = 0;
    row.slice(0, 5).forEach(d => {
      if (!d) return;
      const k = format(d, 'yyyy-MM-dd');
      if (pnlMap[k]) { sum += pnlMap[k].pnl; cnt += pnlMap[k].count; }
    });
    return { sum, cnt };
  });

  const isToday = (d: Date | null) => d && isSameDay(d, today);

  const cellBg = (pnl: number | undefined) => {
    if (pnl === undefined) return 'transparent';
    if (pnl > 0) return 'rgba(78,190,150,0.09)';
    if (pnl < 0) return 'rgba(200,116,106,0.09)';
    return 'transparent';
  };

  const monthLabel = format(current, 'MMM yyyy');

  return (
    <>
      <div style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setCurrent(p => subMonths(p, 1))} style={navBtn}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 90, textAlign: 'center' }}>{monthLabel}</span>
            <button onClick={() => setCurrent(p => addMonths(p, 1))} style={navBtn}>
              <ChevronRight size={14} />
            </button>
          </div>
          <button onClick={() => setCurrent(new Date())} style={{ ...navBtn, padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' }}>
            Today
          </button>
        </div>

        {/* Grid */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {DOW.map((d, i) => (
                <th key={d} style={{
                  padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                  textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  width: i === 5 ? '14%' : '12%',
                  background: i === 5 ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((day, ci) => {
                  const k = day ? format(day, 'yyyy-MM-dd') : '';
                  const entry = k ? pnlMap[k] : undefined;
                  const pnl = entry?.pnl;
                  const cnt = entry?.count ?? 0;
                  const active = day && isSameMonth(day, current);
                  const tod = isToday(day);
                  const isWeekSumCol = ci === 5;
                  const ws = isWeekSumCol ? weekSums[ri] : null;

                  // Representative date for week click: first day of this row's Mon-Fri range
                  const weekRepDate = row.find(d => d && isSameMonth(d, current));
                  const clickable = (active && pnl !== undefined) || (isWeekSumCol && ws && ws.sum !== 0);

                  return (
                    <td
                      key={ci}
                      onClick={() => {
                        if (isWeekSumCol && weekRepDate) {
                          setSelectedDay({ date: format(weekRepDate, 'yyyy-MM-dd'), isWeek: true });
                        } else if (active && pnl !== undefined && day) {
                          setSelectedDay({ date: k, isWeek: false });
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        verticalAlign: 'top',
                        height: 88,
                        border: '1px solid rgba(255,255,255,0.05)',
                        background: isWeekSumCol
                          ? 'rgba(255,255,255,0.025)'
                          : (active && pnl !== undefined ? cellBg(pnl) : 'transparent'),
                        outline: tod ? '1.5px solid var(--accent)' : 'none',
                        outlineOffset: '-1px',
                        borderRadius: tod ? 6 : 0,
                        position: 'relative',
                        cursor: clickable ? 'pointer' : 'default',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.4)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; }}
                    >
                      {isWeekSumCol && ws ? (
                        /* Weekly sum cell */
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            W{ri + 1}
                          </div>
                          <div style={{
                            fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em',
                            color: ws.sum > 0 ? '#4ebe96' : ws.sum < 0 ? '#c8746a' : 'var(--text-muted)',
                            textShadow: ws.sum > 0 ? '0 0 8px rgba(78,190,150,0.3)' : ws.sum < 0 ? '0 0 8px rgba(200,116,106,0.3)' : 'none',
                          }}>
                            {ws.sum !== 0 ? fmt$(ws.sum) : '—'}
                          </div>
                          {ws.cnt > 0 && (
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>{ws.cnt} trades</div>
                          )}
                        </div>
                      ) : active ? (
                        <>
                          {/* Date number */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                            <span style={{
                              fontSize: 11, fontWeight: tod ? 800 : 500,
                              color: tod ? '#fff' : 'var(--text-muted)',
                              background: tod ? 'var(--accent)' : 'transparent',
                              borderRadius: '50%', width: 20, height: 20,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {day!.getDate()}
                            </span>
                          </div>
                          {/* P&L */}
                          {pnl !== undefined && (
                            <>
                              <div style={{
                                fontSize: 12, fontWeight: 700,
                                color: pnl > 0 ? '#4ebe96' : pnl < 0 ? '#c8746a' : 'var(--text-muted)',
                                lineHeight: 1.2, marginBottom: 2,
                                letterSpacing: '-0.02em',
                              }}>
                                {fmt$(pnl)}
                              </div>
                              {cnt > 0 && (
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cnt} trades</div>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
                          {day?.getDate()}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDay && (
        <DayPerformanceModal
          date={selectedDay.date}
          isWeek={selectedDay.isWeek}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  );
}

const navBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6, padding: '4px 6px', cursor: 'pointer',
  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, fontWeight: 500,
};
