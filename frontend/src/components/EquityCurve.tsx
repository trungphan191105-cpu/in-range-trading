/**
 * Equity curve — TraderSync "DAILY NET CUMULATIVE P&L" style
 * Dark panel, bright neon-green line, dashed grid, DD/MM x-axis labels
 */
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';

interface Point { date: string; equity: number; }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v: number = payload[0].value;
  const pos = v >= 0;
  return (
    <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 12px', fontSize: 12, minWidth: 120 }}>
      <div style={{ color: '#6b7280', marginBottom: 4, fontSize: 11, letterSpacing: '0.04em' }}>
        {(() => { try { return format(parseISO(label), 'dd/MM/yyyy'); } catch { return label; } })()}
      </div>
      <div style={{ color: pos ? '#00e676' : '#ef4444', fontWeight: 700, fontSize: 14, fontFamily: "'DM Serif Display', Georgia, serif" }}>
        {pos ? '+' : ''}{v.toFixed(2)} USD
      </div>
    </div>
  );
}

export default function EquityCurve({ data, height = 220, title = 'DAILY NET CUMULATIVE P&L' }: { data: Point[]; height?: number; title?: string }) {
  if (!data?.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 13 }}>
        No data yet
      </div>
    );
  }

  const last = data[data.length - 1]?.equity ?? 0;
  const positive = last >= 0;
  const lineColor = positive ? '#00e676' : '#ef4444';
  const glowColor = positive ? 'rgba(0,230,118,0.25)' : 'rgba(239,68,68,0.25)';

  return (
    <div style={{ width: '100%' }}>
      {/* Title strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: lineColor, letterSpacing: '-0.02em', fontFamily: "'DM Serif Display', Georgia, serif" }}>
          {positive ? '+' : ''}{last.toFixed(2)} USD
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`eqGrad-${positive}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Dashed vertical grid lines only — matching the reference */}
          <CartesianGrid
            strokeDasharray="1 6"
            stroke="rgba(255,255,255,0.06)"
            vertical={true}
            horizontal={false}
          />
          {/* Subtle horizontal lines */}
          <CartesianGrid
            strokeDasharray="0"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
            horizontal={true}
          />

          <XAxis
            dataKey="date"
            tickFormatter={(d) => { try { return format(parseISO(d), 'dd/MM'); } catch { return d; } }}
            tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 500, letterSpacing: '0.02em' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v >= 0 ? '' : ''}${v.toFixed(0)}`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1, strokeDasharray: '3 3' }} />

          {/* Glow layer underneath */}
          <Area type="monotone" dataKey="equity"
            stroke={glowColor} strokeWidth={6} fill="none" dot={false}
            isAnimationActive={true}
          />
          {/* Main crisp line + area fill */}
          <Area type="monotone" dataKey="equity"
            stroke={lineColor} strokeWidth={1.8}
            fill={`url(#eqGrad-${positive})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
