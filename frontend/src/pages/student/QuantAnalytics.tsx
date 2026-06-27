/**
 * Quant Analytics Module — Locked until 100 closed trades per symbol
 * Math: Win Rate, R:R, EV, Sharpe Ratio, Pearson Correlation
 * Simulation: Monte Carlo 10,000 paths for 3 prop firm account types
 * Charts: Equity Curve (raw vs filtered), MC Fan, Discipline Scatter
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, Unlock, TrendingUp, Activity, BarChart2, Target, Brain, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

const UNLOCK_THRESHOLD = 100;

// ── Quant Math Engine ─────────────────────────────────────────────────────────

function computeMetrics(trades: any[]) {
  if (!trades.length) return null;
  const pnls = trades.map(t => Number(t.pnl));
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const n = trades.length;

  const winRate = wins.length / n;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const rr = avgLoss ? avgWin / avgLoss : 0;
  const ev = winRate * avgWin - (1 - winRate) * avgLoss;

  const mean = pnls.reduce((a, b) => a + b, 0) / n;
  const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev ? mean / stdDev : 0;

  // Pearson correlation (discipline_score vs pnl)
  const withDisc = trades.filter(t => t.discipline_score != null);
  let pearson = 0;
  if (withDisc.length >= 5) {
    const x = withDisc.map(t => Number(t.discipline_score));
    const y = withDisc.map(t => Number(t.pnl));
    const mx = x.reduce((a, b) => a + b, 0) / x.length;
    const my = y.reduce((a, b) => a + b, 0) / y.length;
    const num = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0);
    const den = Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0) * y.reduce((s, yi) => s + (yi - my) ** 2, 0));
    pearson = den ? num / den : 0;
  }

  return { n, winRate, avgWin, avgLoss, rr, ev, mean, stdDev, sharpe, pearson };
}

// Monte Carlo bootstrap — returns pass rate + payout expectancy for a prop account
function monteCarloSim(pnls: number[], profitTarget: number, maxDrawdown: number, runs = 10_000, tradeSeq = 30) {
  let passes = 0;
  let totalPayout = 0;
  const samplePaths: number[][] = [];

  for (let r = 0; r < runs; r++) {
    let equity = 0;
    let minEquity = 0;
    let passed = false;
    const path: number[] = [0];

    for (let i = 0; i < tradeSeq; i++) {
      const pick = pnls[Math.floor(Math.random() * pnls.length)];
      equity += pick;
      if (equity < minEquity) minEquity = equity;
      path.push(equity);

      if (equity >= profitTarget) { passed = true; break; }
      if (equity <= -maxDrawdown) break;
    }

    if (passed) {
      passes++;
      totalPayout += Math.min(equity * 0.8, profitTarget * 0.8); // 80% split payout
    }
    if (r < 100) samplePaths.push(path); // store first 100 paths for fan chart
  }

  return {
    passRate: passes / runs,
    payoutExpectancy: passes ? totalPayout / passes : 0,
    samplePaths,
  };
}

// Regression line for scatter
function linearRegression(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) /
    pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const intercept = my - slope * mx;
  return { slope, intercept };
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

const PROP_PACKAGES = [
  { label: '$50K Account',  target: 3000, dd: 2500,  color: '#479ffa' },
  { label: '$100K Account', target: 6000, dd: 5000,  color: '#4ebe96' },
  { label: '$150K Account', target: 9000, dd: 7500,  color: '#a78bfa' },
];

function MetricCard({ label, value, sub, color = 'var(--text)' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(19,19,19,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${color}44, transparent)` }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.04em', textShadow: `0 0 20px ${color}33` }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Lock Screen ───────────────────────────────────────────────────────────────

function LockScreen({ symbol, count }: { symbol: string; count: number }) {
  const pct = Math.min((count / UNLOCK_THRESHOLD) * 100, 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center', gap: 20 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(71,159,250,0.08)', border: '1px solid rgba(71,159,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={28} color="#479ffa" style={{ opacity: 0.7 }} />
      </div>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }}>Quant Module Locked</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
          Log <strong style={{ color: 'var(--accent)' }}>{UNLOCK_THRESHOLD} closed trades</strong> for{' '}
          <strong style={{ color: 'var(--text)' }}>{symbol}</strong> to unlock full quantitative analysis,
          Monte Carlo simulation, and predictive prop firm pass rates.
        </p>
      </div>
      <div style={{ width: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ color: 'var(--accent)' }}>{count} / {UNLOCK_THRESHOLD} trades</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #479ffa, #a0c8ff)', borderRadius: 99, transition: 'width 0.6s', boxShadow: '0 0 12px rgba(71,159,250,0.4)' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          {UNLOCK_THRESHOLD - count} more trades needed
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function QuantAnalytics() {
  const [symbol, setSymbol] = useState('');
  const [symOpen, setSymOpen] = useState(false);

  const { data: symbols = [] } = useQuery({ queryKey: ['quant-symbols'], queryFn: () => api.getQuantSymbols() });
  const syms = symbols as any[];
  const selectedSym = syms.find(s => s.symbol === symbol);
  const unlocked = (selectedSym?.count || 0) >= UNLOCK_THRESHOLD;

  const { data: rawTrades = [], isLoading } = useQuery({
    queryKey: ['quant-trades', symbol],
    queryFn: () => api.getQuantTrades(symbol),
    enabled: !!symbol && unlocked,
  });
  const trades = rawTrades as any[];

  const metrics = useMemo(() => computeMetrics(trades), [trades]);

  const pnls = trades.map(t => Number(t.pnl));

  const simResults = useMemo(() => {
    if (!pnls.length || !unlocked) return null;
    return PROP_PACKAGES.map(pkg => ({
      ...pkg,
      ...monteCarloSim(pnls, pkg.target, pkg.dd),
    }));
  }, [pnls.length, unlocked]);

  // Equity curves
  const equityRaw = useMemo(() => {
    let cum = 0;
    return trades.map((t, i) => { cum += Number(t.pnl); return { i: i + 1, raw: parseFloat(cum.toFixed(2)) }; });
  }, [trades]);

  const equityFiltered = useMemo(() => {
    let cum = 0; let idx = 0;
    const pts: any[] = [];
    trades.forEach((t) => {
      if ((t.discipline_score ?? 10) >= 7) { cum += Number(t.pnl); idx++; pts.push({ i: idx, filtered: parseFloat(cum.toFixed(2)) }); }
    });
    return pts;
  }, [trades]);

  const equityMerged = useMemo(() => {
    const map: Record<number, any> = {};
    equityRaw.forEach(p => { map[p.i] = { ...map[p.i], i: p.i, raw: p.raw }; });
    equityFiltered.forEach(p => { if (map[p.i]) map[p.i].filtered = p.filtered; });
    return Object.values(map);
  }, [equityRaw, equityFiltered]);

  // MC Fan chart — 100 sample paths
  const fanData = useMemo(() => {
    if (!simResults) return [];
    const paths = simResults[1]?.samplePaths || []; // use $100K paths
    const maxLen = Math.max(...paths.map(p => p.length));
    const arr: any[] = [];
    for (let i = 0; i < maxLen; i++) {
      const point: any = { i };
      paths.forEach((p, pi) => { if (i < p.length) point[`p${pi}`] = parseFloat(p[i].toFixed(2)); });
      arr.push(point);
    }
    return arr;
  }, [simResults]);

  // Scatter data
  const scatterData = useMemo(() =>
    trades.filter(t => t.discipline_score != null)
      .map(t => ({ x: Number(t.discipline_score), y: parseFloat(Number(t.pnl).toFixed(2)) })),
    [trades]
  );
  const regLine = useMemo(() => {
    const reg = linearRegression(scatterData);
    if (!reg) return [];
    return [1, 10].map(x => ({ x, y: parseFloat((reg.slope * x + reg.intercept).toFixed(2)) }));
  }, [scatterData]);

  const card: React.CSSProperties = {
    background: 'rgba(19,19,19,0.65)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '20px 22px',
    position: 'relative',
    overflow: 'hidden',
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14,
  };

  return (
    <div className="font-avenir" style={{ position: 'relative' }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '25%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 65%)', animation: 'orbDrift 22s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,159,250,0.04) 0%, transparent 65%)', animation: 'orbDrift 18s ease-in-out infinite reverse 3s' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={14} color="#a78bfa" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em' }}>Quant Analytics</h2>
              {unlocked && <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(78,190,150,0.1)', border: '1px solid rgba(78,190,150,0.3)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><Unlock size={9} /> UNLOCKED</div>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Statistical edge analysis · Monte Carlo simulation · Prop firm pass rates</p>
          </div>

          {/* Symbol selector */}
          {syms.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setSymOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minWidth: 180 }}>
                <BarChart2 size={14} color="var(--accent)" />
                <span style={{ flex: 1, textAlign: 'left' }}>{symbol || 'Select Symbol'}</span>
                <ChevronDown size={12} color="var(--text-muted)" />
              </button>
              {symOpen && (
                <>
                  <div onClick={() => setSymOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                  <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 41, background: 'rgba(13,13,13,0.97)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, minWidth: 220, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
                    {syms.map((s: any) => (
                      <button key={s.symbol} onClick={() => { setSymbol(s.symbol); setSymOpen(false); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 7, border: 'none', background: symbol === s.symbol ? 'rgba(255,255,255,0.06)' : 'transparent', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span>{s.symbol}</span>
                        <span style={{ fontSize: 10, color: s.count >= UNLOCK_THRESHOLD ? 'var(--green)' : 'var(--text-dim)', fontWeight: 700 }}>
                          {s.count >= UNLOCK_THRESHOLD ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Unlock size={9} />{s.count}</span> : `${s.count}/${UNLOCK_THRESHOLD}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!symbol ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <Activity size={52} style={{ opacity: 0.12, marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>Select a symbol to analyse</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>
              {syms.length === 0 ? 'No closed trades found — log trades and close them to get started.' : 'Choose a symbol from the dropdown above.'}
            </p>
          </div>
        ) : !unlocked ? (
          <LockScreen symbol={symbol} count={selectedSym?.count || 0} />
        ) : isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 13 }}>Computing…</div>
        ) : metrics ? (
          <>
            {/* ── KPI Strip ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
              <MetricCard label="Win Rate" value={`${(metrics.winRate * 100).toFixed(1)}%`} sub={`${trades.filter(t => t.pnl > 0).length}W / ${trades.filter(t => t.pnl < 0).length}L`} color="#4ebe96" />
              <MetricCard label="Actual R:R" value={`1:${metrics.rr.toFixed(2)}`} sub={`Avg win $${metrics.avgWin.toFixed(0)} · loss $${metrics.avgLoss.toFixed(0)}`} color="#479ffa" />
              <MetricCard label="Exp. Value / Trade" value={`${metrics.ev >= 0 ? '+' : ''}$${metrics.ev.toFixed(2)}`} sub="EV = WR×AvgW − LR×AvgL" color={metrics.ev >= 0 ? '#4ebe96' : '#c8746a'} />
              <MetricCard label="Sharpe Ratio" value={metrics.sharpe.toFixed(3)} sub={`σ = $${metrics.stdDev.toFixed(2)}`} color={metrics.sharpe >= 0.5 ? '#4ebe96' : metrics.sharpe >= 0 ? '#ffa16c' : '#c8746a'} />
              <MetricCard label="Discipline Corr." value={metrics.pearson.toFixed(3)} sub={metrics.pearson > 0.2 ? 'Strong positive' : metrics.pearson > 0 ? 'Weak positive' : 'Negative'} color={metrics.pearson > 0 ? '#a78bfa' : '#c8746a'} />
            </div>

            {/* ── Monte Carlo ── */}
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Target size={14} color="#a78bfa" />
                <div style={sectionLabel}>Monte Carlo Prop Firm Simulation · 10,000 Runs × 30-Trade Sequence</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {(simResults || []).map(pkg => (
                  <div key={pkg.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${pkg.color}55, transparent)` }} />
                    <div style={{ fontSize: 12, fontWeight: 800, color: pkg.color, marginBottom: 10, letterSpacing: '-0.02em' }}>{pkg.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Target</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-soft)' }}>+${pkg.target.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Max DD</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-soft)' }}>-${pkg.dd.toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Pass Rate</span>
                        <span style={{ color: pkg.color }}>{(pkg.passRate * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pkg.passRate * 100}%`, background: pkg.color, borderRadius: 99, boxShadow: `0 0 8px ${pkg.color}55` }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Avg Payout (on pass)</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: pkg.color, letterSpacing: '-0.04em', textShadow: `0 0 16px ${pkg.color}44` }}>
                      +${pkg.payoutExpectancy.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Charts row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

              {/* Equity Curve */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <TrendingUp size={13} color="#4ebe96" />
                  <div style={sectionLabel}>Equity Curve — Raw vs Discipline Filtered (score ≥ 7)</div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  {[{ c: '#4ebe96', l: 'Raw' }, { c: '#479ffa', l: 'Filtered' }].map(l => (
                    <div key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}>
                      <div style={{ width: 20, height: 2, background: l.c, borderRadius: 1 }} /> {l.l}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={equityMerged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="qGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ebe96" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#4ebe96" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="qGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#479ffa" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#479ffa" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="i" tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                    <Tooltip contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#868f97' }} itemStyle={{ color: '#e6e6e6' }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                    <Area type="monotone" dataKey="raw" stroke="#4ebe96" strokeWidth={1.6} fill="url(#qGrad1)" dot={false} connectNulls />
                    <Area type="monotone" dataKey="filtered" stroke="#479ffa" strokeWidth={1.6} fill="url(#qGrad2)" dot={false} connectNulls strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Discipline Scatter */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Brain size={13} color="#a78bfa" />
                  <div style={sectionLabel}>Discipline Score vs P&L — Correlation r={metrics.pearson.toFixed(3)}</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" dataKey="x" domain={[0, 11]} tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Discipline', position: 'insideBottom', fill: '#555a60', fontSize: 10, offset: -2 }} />
                    <YAxis type="number" dataKey="y" tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                    <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }} contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: any, n) => [n === 'y' ? `$${Number(v).toFixed(2)}` : v, n === 'y' ? 'P&L' : 'Discipline']} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                    <Scatter data={scatterData} fill="#a78bfa" fillOpacity={0.6} r={3.5} />
                    <Line data={regLine} type="linear" dataKey="y" stroke="#479ffa" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* MC Fan Chart */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Activity size={13} color="#ffa16c" />
                <div style={sectionLabel}>Monte Carlo Fan — 100 Representative Paths ($100K Challenge · Target +$6,000 · DD -$5,000)</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={fanData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="i" tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#555a60', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                  <ReferenceLine y={6000} stroke="rgba(78,190,150,0.4)" strokeDasharray="4 2" label={{ value: 'Target', fill: '#4ebe96', fontSize: 9, position: 'right' }} />
                  <ReferenceLine y={-5000} stroke="rgba(200,116,106,0.4)" strokeDasharray="4 2" label={{ value: 'Max DD', fill: '#c8746a', fontSize: 9, position: 'right' }} />
                  {Array.from({ length: Math.min(100, Object.keys(fanData[0] || {}).length - 1) }, (_, i) => (
                    <Line key={i} type="monotone" dataKey={`p${i}`} stroke="rgba(167,139,250,0.18)" strokeWidth={1} dot={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
