import { format, eachDayOfInterval, subMonths } from 'date-fns';
import { useThemeStore, CHART_COLORS } from '../store/themeStore';

interface DayPnl { date: string; pnl: number; }

export default function HeatmapCalendar({ data }: { data: DayPnl[] }) {
  const { mindTheme } = useThemeStore();
  const cc = CHART_COLORS[mindTheme];

  const map: Record<string, number> = {};
  for (const d of data) map[d.date] = d.pnl;

  const end = new Date();
  const start = subMonths(end, 5);
  const days = eachDayOfInterval({ start, end });
  const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl)), 1);

  function getColor(pnl: number | undefined) {
    if (pnl === undefined) return 'rgba(255,255,255,0.03)';
    if (pnl === 0) return 'rgba(255,255,255,0.05)';
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    const base = pnl > 0 ? cc.profit : cc.loss;
    // Parse hex or rgb and apply intensity
    return applyIntensity(base, 0.15 + intensity * 0.85);
  }

  const firstDow = days[0].getDay();
  const cells: (Date | null)[] = Array(firstDow).fill(null).concat(days);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

  return (
    <div>
      <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 18 }}>
          {['CN','T2','T3','T4','T5','T6','T7'].map(d => (
            <div key={d} style={{ width: 24, height: 13, fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{d}</div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
            {weeks.map((week, wi) => {
              const first = week.find(d => d);
              const show = first && first.getDate() <= 7;
              return (
                <div key={wi} style={{ width: 13, fontSize: 10, color: show ? 'var(--text-muted)' : 'transparent' }}>
                  {show ? months[first!.getMonth()] : ''}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Array(7).fill(null).map((_, di) => {
                  const day = week[di];
                  if (!day) return <div key={di} style={{ width: 13, height: 13 }} />;
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const pnl = map[dateStr];
                  return (
                    <div key={di} title={pnl !== undefined ? `${dateStr}: $${pnl.toFixed(2)}` : dateStr}
                      style={{ width: 13, height: 13, borderRadius: 2, background: getColor(pnl), cursor: pnl !== undefined ? 'pointer' : 'default', transition: 'opacity 0.2s' }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
        <span>Less</span>
        {[0.1, 0.3, 0.55, 0.75, 1].map(v => (
          <div key={v} style={{ width: 12, height: 12, borderRadius: 2, background: applyIntensity(cc.profit, v) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// Apply opacity to a hex or rgb color string
function applyIntensity(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  }
  if (color.startsWith('rgba')) {
    return color.replace(/[\d.]+\)$/, `${alpha.toFixed(2)})`);
  }
  return color;
}
