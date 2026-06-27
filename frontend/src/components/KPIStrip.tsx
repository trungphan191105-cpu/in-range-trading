interface KPI {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function KPIStrip({ kpis }: { kpis: KPI[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 10, marginBottom: 22 }}>
      {kpis.map((k) => (
        <div key={k.label} style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px 18px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          {/* Subtle top glow line */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.25), transparent)' }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{k.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: k.color || 'var(--text)', lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
          {k.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, fontWeight: 500 }}>{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}
