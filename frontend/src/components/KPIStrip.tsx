interface KPI {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  sparkData?: number[];
}

function Spark({ data, color = '#5fd6a4' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 80, h = 32;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const path = `M${pts.join(' L')}`;
  const fill = `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
  return (
    <svg width={w} height={h} style={{ flexShrink: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KPIStrip({ kpis }: { kpis: KPI[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 10, marginBottom: 22 }}>
      {kpis.map((k) => (
        <div key={k.label} style={{
          background: 'rgba(20,21,23,0.42)',
          backdropFilter: 'blur(20px) saturate(125%)',
          WebkitBackdropFilter: 'blur(20px) saturate(125%)',
          border: '1px solid rgba(255,255,255,0.085)',
          borderRadius: 14,
          padding: '16px 18px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'border-color 0.2s',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.085)')}
        >
          {/* top glow sheen */}
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${k.color || 'rgba(95,214,164,0.2)'}, transparent)` }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(205,205,205,0.42)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color || '#f3f3f3', lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 11, color: 'rgba(210,210,210,0.45)', marginTop: 5, fontWeight: 500 }}>{k.sub}</div>}
          </div>
          {k.sparkData && k.sparkData.length >= 2 && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <Spark data={k.sparkData} color={k.color || '#5fd6a4'} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
