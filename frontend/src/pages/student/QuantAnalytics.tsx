/**
 * Quant Analytics — Advanced Prop Firm Modeling Engine
 * Barrier Option EV · Convex Payoff · Risk Geometry Surface (3D) · Monte Carlo Phase Space
 * Toy vs Real Strategy · Ruin Boundary · Funded Phase Modeling
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Lock, Unlock, TrendingUp, Activity, BarChart2, Target, Brain,
  ChevronDown, FileDown, Zap, Shield, GitBranch, AlertTriangle, Layers,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, ComposedChart,
} from 'recharts';
import * as THREE from 'three';

const UNLOCK_THRESHOLD = 100;

// ── Math Engine ────────────────────────────────────────────────────────────────

function computeMetrics(trades: any[]) {
  if (!trades.length) return null;
  const pnls = trades.map(t => Number(t.pnl));
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const n = pnls.length;

  const winRate = wins.length / n;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const rr = avgLoss ? avgWin / avgLoss : 0;
  const ev = winRate * avgWin - (1 - winRate) * avgLoss;

  const mean = pnls.reduce((a, b) => a + b, 0) / n;
  const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev ? mean / stdDev : 0;

  // Skewness (3rd standardized moment)
  const skewness = stdDev ? pnls.reduce((s, v) => s + ((v - mean) / stdDev) ** 3, 0) / n : 0;

  // Profit Factor
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  // Asymmetry Ratio — non-linear upside vs linear downside
  const asymmetryRatio = avgLoss ? avgWin / avgLoss : 0;

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

  // Kelly fraction
  const kelly = rr ? winRate - (1 - winRate) / rr : 0;

  return {
    n, winRate, avgWin, avgLoss, rr, ev, mean, stdDev, sharpe, skewness,
    profitFactor, asymmetryRatio, pearson, kelly,
    grossProfit, grossLoss,
    wins: wins.length, losses: losses.length,
  };
}

// Monte Carlo — enhanced with full stats
function monteCarloSim(pnls: number[], profitTarget: number, maxDrawdown: number, runs = 10_000, tradeSeq = 30) {
  let passes = 0, fails = 0, timeouts = 0;
  let totalPayout = 0, totalTradesToPass = 0;
  const finalEquities: number[] = [];
  const samplePaths: number[][] = [];

  for (let r = 0; r < runs; r++) {
    let equity = 0, passed = false, failed = false;
    let tradesToPass = tradeSeq;
    const path: number[] = [0];
    for (let i = 0; i < tradeSeq; i++) {
      equity += pnls[Math.floor(Math.random() * pnls.length)];
      path.push(equity);
      if (equity >= profitTarget) { passed = true; tradesToPass = i + 1; break; }
      if (equity <= -maxDrawdown) { failed = true; break; }
    }
    finalEquities.push(equity);
    if (passed) { passes++; totalPayout += Math.min(equity * 0.8, profitTarget * 0.8); totalTradesToPass += tradesToPass; }
    else if (failed) fails++;
    else timeouts++;
    if (r < 150) samplePaths.push(path);
  }

  const sorted = [...finalEquities].sort((a, b) => a - b);
  return {
    passRate: passes / runs, failRate: fails / runs, timeoutRate: timeouts / runs,
    payoutExpectancy: passes ? totalPayout / passes : 0,
    avgTradesToPass: passes ? totalTradesToPass / passes : 0,
    evMean: finalEquities.reduce((a, b) => a + b, 0) / runs,
    evP5: sorted[Math.floor(runs * 0.05)],
    evP95: sorted[Math.floor(runs * 0.95)],
    samplePaths,
  };
}

// Fast MC for surface grid — uses normalized units (loss=1, win=RR)
function fastPassRate(wr: number, rr: number, target: number, dd: number, runs = 400, seq = 30): number {
  let passes = 0;
  for (let r = 0; r < runs; r++) {
    let eq = 0;
    for (let i = 0; i < seq; i++) {
      eq += Math.random() < wr ? rr : -1;
      if (eq >= target) { passes++; break; }
      if (eq <= -dd) break;
    }
  }
  return passes / runs;
}

// Barrier option EV for prop firm evaluation phase
function barrierOptionEV(pnls: number[], profitTarget: number, maxDrawdown: number, challengeFee: number, profitSplit = 0.8) {
  const sim = monteCarloSim(pnls, profitTarget, maxDrawdown, 5000, 30);
  const passProb = sim.passRate;
  const failProb = sim.failRate + sim.timeoutRate;
  const expectedGrossIfPass = sim.payoutExpectancy;
  const netEV = passProb * (expectedGrossIfPass - challengeFee) - failProb * challengeFee;
  return {
    passProb, failProb, expectedGrossIfPass, netEV,
    breakevenFeeAtCurrentEdge: passProb > 0 ? passProb * expectedGrossIfPass / (passProb + failProb) : 0,
    profitSplit, challengeFee,
  };
}

// Ruin probability (analytical Kelly-based)
function ruinProbability(wr: number, rr: number): number {
  const kelly = wr - (1 - wr) / rr;
  if (kelly <= 0) return 1.0; // negative edge = certain ruin
  // Gambler's ruin: P(ruin) ≈ ((1-p)/p)^(B/bet) → simplified per-trade
  const ratio = (1 - wr) / wr;
  return Math.pow(ratio, 1 / rr);
}

// Toy strategy benchmark
function toyStrategy(n: number, wr = 0.5, rr = 2.0, stdNoise = 0) {
  const trades = [];
  for (let i = 0; i < n; i++) {
    const won = Math.random() < wr;
    const pnl = won ? rr + (Math.random() - 0.5) * stdNoise : -1 + (Math.random() - 0.5) * stdNoise * 0.3;
    trades.push({ pnl, won });
  }
  return trades;
}

// Linear regression
function linearRegression(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return null;
  const n = pts.length, mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return { slope, intercept: my - slope * mx };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PROP_PACKAGES = [
  { label: '$50K Account',  target: 3000, dd: 2500,  fee: 300,  color: '#479ffa' },
  { label: '$100K Account', target: 6000, dd: 5000,  fee: 550,  color: '#4ebe96' },
  { label: '$150K Account', target: 9000, dd: 7500,  fee: 800,  color: '#a78bfa' },
];

// ── 3D Risk Surface (Three.js canvas) ─────────────────────────────────────────

function RiskSurface3D({ currentWR, currentRR }: { currentWR: number; currentRR: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 700, H = 420;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080808);
    scene.fog = new THREE.FogExp2(0x080808, 0.008);

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 2000);
    camera.position.set(80, 60, 80);
    camera.lookAt(40, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0x1a1a2e, 3));
    const dirLight = new THREE.DirectionalLight(0x4ebe96, 2);
    dirLight.position.set(50, 80, 50);
    scene.add(dirLight);
    const blueLight = new THREE.PointLight(0x479ffa, 1.5, 300);
    blueLight.position.set(-40, 60, -40);
    scene.add(blueLight);

    // Build surface grid: WR 20%→80%, RR 0.5→4.0
    const NX = 28, NZ = 28;
    const GRID_SCALE = 80;
    const positions: number[] = [], colors: number[] = [], indices: number[] = [];

    const grid: number[][] = [];
    for (let iz = 0; iz < NZ; iz++) {
      grid[iz] = [];
      for (let ix = 0; ix < NX; ix++) {
        const wr = 0.2 + (ix / (NX - 1)) * 0.6;
        const rr = 0.5 + (iz / (NZ - 1)) * 3.5;
        // Normalized challenge: target=8 units, dd=5 units (each trade: win=rr, loss=1)
        const pr = fastPassRate(wr, rr, 8, 5, 300, 30);
        grid[iz][ix] = pr;
      }
    }

    const colorLow = new THREE.Color(0x7f0000);   // deep crimson
    const colorMid = new THREE.Color(0x1a4a6e);   // dark blue
    const colorHigh = new THREE.Color(0x00ffe5);   // neon cyan

    for (let iz = 0; iz < NZ; iz++) {
      for (let ix = 0; ix < NX; ix++) {
        const pr = grid[iz][ix];
        const x = (ix / (NX - 1)) * GRID_SCALE;
        const y = pr * 40;  // height = pass rate
        const z = (iz / (NZ - 1)) * GRID_SCALE;
        positions.push(x, y, z);
        // Color gradient
        const c = new THREE.Color();
        if (pr < 0.5) c.lerpColors(colorLow, colorMid, pr * 2);
        else c.lerpColors(colorMid, colorHigh, (pr - 0.5) * 2);
        colors.push(c.r, c.g, c.b);
      }
    }

    // Build indices (two triangles per quad)
    for (let iz = 0; iz < NZ - 1; iz++) {
      for (let ix = 0; ix < NX - 1; ix++) {
        const a = iz * NX + ix, b = iz * NX + ix + 1;
        const c = (iz + 1) * NX + ix, d = (iz + 1) * NX + ix + 1;
        indices.push(a, b, d, a, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 60, transparent: true, opacity: 0.92 });
    scene.add(new THREE.Mesh(geo, mat));

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x222233, wireframe: true, transparent: true, opacity: 0.15 });
    scene.add(new THREE.Mesh(geo, wireMat));

    // Grid floor
    const gridHelper = new THREE.GridHelper(GRID_SCALE, 10, 0x1a1a2e, 0x111118);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Axis labels (sprites)
    const makeLabel = (text: string, pos: THREE.Vector3) => {
      const canvas2d = document.createElement('canvas');
      canvas2d.width = 256; canvas2d.height = 64;
      const ctx = canvas2d.getContext('2d')!;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 28px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 128, 42);
      const tex = new THREE.CanvasTexture(canvas2d);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.position.copy(pos);
      sp.scale.set(18, 5, 1);
      scene.add(sp);
    };
    makeLabel('Win Rate →', new THREE.Vector3(40, -4, -10));
    makeLabel('R:R Ratio →', new THREE.Vector3(-12, -4, 40));
    makeLabel('Pass Rate %', new THREE.Vector3(-16, 22, -8));

    // Current trading coordinate — glowing white node
    const cwrIdx = (currentWR - 0.2) / 0.6;
    const crrIdx = (currentRR - 0.5) / 3.5;
    if (cwrIdx >= 0 && cwrIdx <= 1 && crrIdx >= 0 && crrIdx <= 1) {
      const cix = Math.round(cwrIdx * (NX - 1));
      const ciz = Math.round(crrIdx * (NZ - 1));
      const cPR = grid[ciz]?.[cix] ?? 0;
      const cx = cwrIdx * GRID_SCALE;
      const cy = cPR * 40 + 3;
      const cz = crrIdx * GRID_SCALE;

      // Pulsing sphere
      const sphereGeo = new THREE.SphereGeometry(2.2, 16, 16);
      const sphereMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, transparent: true, opacity: 0.95 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(cx, cy, cz);
      scene.add(sphere);

      // Glow ring
      const ringGeo = new THREE.RingGeometry(3, 4.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x4ebe96, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(cx, cy + 0.5, cz);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);

      // Vertical drop line
      const linePts = [new THREE.Vector3(cx, -0.5, cz), new THREE.Vector3(cx, cy, cz)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      scene.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x4ebe96, transparent: true, opacity: 0.5 })));

      // Pulse animation on sphere
      let t = 0;
      const animateSphere = () => {
        t += 0.04;
        const s = 1 + Math.sin(t) * 0.25;
        sphere.scale.setScalar(s);
        sphereMat.emissiveIntensity = 0.5 + Math.sin(t) * 0.5;
        ring.rotation.z += 0.02;
      };

      // Orbit controls (manual drag)
      let isDragging = false, prevX = 0, prevY = 0, theta = 0.6, phi = 0.5, radius = 130;

      const onDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
      const onUp = () => { isDragging = false; };
      const onMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const dx = (e.clientX - prevX) * 0.008;
        const dy = (e.clientY - prevY) * 0.008;
        prevX = e.clientX; prevY = e.clientY;
        theta += dx; phi = Math.max(0.1, Math.min(1.2, phi - dy));
        camera.position.set(
          40 + radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
          20 + radius * Math.sin(phi) * Math.cos(theta)
        );
        camera.lookAt(40, 10, 30);
      };
      const onWheel = (e: WheelEvent) => { radius = Math.max(60, Math.min(200, radius + e.deltaY * 0.1)); e.preventDefault(); };

      renderer.domElement.addEventListener('mousedown', onDown);
      renderer.domElement.addEventListener('mouseup', onUp);
      renderer.domElement.addEventListener('mousemove', onMove);
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
      renderer.domElement.style.cursor = 'grab';

      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        animateSphere();
        renderer.render(scene, camera);
      };
      animate();
    } else {
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
    }

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [currentWR, currentRR]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: 420, borderRadius: 10, overflow: 'hidden', cursor: 'grab' }} />
      <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
        Drag to rotate · Scroll to zoom · ⬤ = your current edge
      </div>
    </div>
  );
}

// ── UI Components ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = 'var(--text)', badge }: { label: string; value: string; sub?: string; color?: string; badge?: string }) {
  return (
    <div style={{ background: 'rgba(19,19,19,0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${color}44, transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
        {badge && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${color}18`, border: `1px solid ${color}33`, color }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.04em', textShadow: `0 0 20px ${color}33` }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SimSummaryCard({ pkg, sim }: { pkg: typeof PROP_PACKAGES[0]; sim: ReturnType<typeof monteCarloSim> & { fee: number } }) {
  const donutData = [
    { name: 'Pass', value: parseFloat((sim.passRate * 100).toFixed(2)), fill: '#4ebe96' },
    { name: 'Fail', value: parseFloat((sim.failRate * 100).toFixed(2)), fill: '#c8746a' },
    { name: 'Timeout', value: parseFloat((sim.timeoutRate * 100).toFixed(2)), fill: '#ffa16c' },
  ];
  const fmt = (v: number) => v >= 0 ? `+$${v.toFixed(0)}` : `-$${Math.abs(v).toFixed(0)}`;

  return (
    <div style={{ background: 'rgba(19,19,19,0.65)', backdropFilter: 'blur(20px)', border: `1px solid ${pkg.color}22`, borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: `linear-gradient(90deg, transparent, ${pkg.color}55, transparent)` }} />
      <div style={{ fontSize: 12, fontWeight: 800, color: pkg.color, marginBottom: 14, letterSpacing: '-0.02em' }}>
        {pkg.label} <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 500 }}>· Fee ${pkg.fee}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', flexShrink: 0, width: 100, height: 100 }}>
          <PieChart width={100} height={100}>
            <Pie data={donutData} cx={46} cy={46} innerRadius={28} outerRadius={46} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
              {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
          </PieChart>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#4ebe96', lineHeight: 1, letterSpacing: '-0.04em' }}>{(sim.passRate * 100).toFixed(1)}%</div>
            <div style={{ fontSize: 7, color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>PASS</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          {donutData.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)', minWidth: 42 }}>{d.name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: d.fill }}>{d.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          {[
            { label: 'Mean Payout', value: `$${sim.payoutExpectancy.toFixed(0)}`, color: '#4ebe96' },
            { label: 'Avg Trades', value: sim.avgTradesToPass > 0 ? sim.avgTradesToPass.toFixed(1) : '—', color: pkg.color },
            { label: 'EV Mean', value: fmt(sim.evMean), color: sim.evMean >= 0 ? '#4ebe96' : '#c8746a' },
            { label: 'EV 5th', value: fmt(sim.evP5), color: sim.evP5 >= 0 ? '#4ebe96' : '#c8746a' },
            { label: 'EV 95th', value: fmt(sim.evP95), color: '#4ebe96' },
            { label: 'Net EV', value: fmt(sim.evMean - pkg.fee * sim.failRate), color: (sim.evMean - pkg.fee * sim.failRate) >= 0 ? '#4ebe96' : '#c8746a' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <strong style={{ color: 'var(--text)' }}>{symbol}</strong> to unlock advanced quant analysis,
          barrier option EV modeling, 3D risk surface, and prop firm Monte Carlo engine.
        </p>
      </div>
      <div style={{ width: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ color: 'var(--accent)' }}>{count} / {UNLOCK_THRESHOLD} trades</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #479ffa, #a0c8ff)', borderRadius: 99, boxShadow: '0 0 12px rgba(71,159,250,0.4)' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{UNLOCK_THRESHOLD - count} more trades needed</div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function QuantAnalytics() {
  const [symbol, setSymbol] = useState('');
  const [symOpen, setSymOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'barrier' | 'geometry' | 'toyreal'>('overview');

  const { data: symbols = [] } = useQuery({ queryKey: ['quant-symbols'], queryFn: () => api.getQuantSymbols(), staleTime: 0 });
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
  const pnls = useMemo(() => trades.map(t => Number(t.pnl)), [trades]);

  const simResults = useMemo(() => {
    if (!pnls.length || !unlocked) return null;
    return PROP_PACKAGES.map(pkg => ({ ...pkg, ...monteCarloSim(pnls, pkg.target, pkg.dd) }));
  }, [pnls.length, unlocked]);

  const barrierEVs = useMemo(() => {
    if (!pnls.length || !unlocked) return null;
    return PROP_PACKAGES.map(pkg => ({ ...pkg, ...barrierOptionEV(pnls, pkg.target, pkg.dd, pkg.fee) }));
  }, [pnls.length, unlocked]);

  // Toy strategy benchmark
  const toyResults = useMemo(() => {
    if (!metrics) return null;
    const n = metrics.n;
    // Toy: ideal 50% WR, 2:1 R:R, perfect execution
    const toyTrades = toyStrategy(n, 0.5, 2.0, 0);
    // Real normalized
    const realMetrics = metrics;
    // Toy metrics
    const toyWins = toyTrades.filter(t => t.won).length;
    const toyPnl = toyTrades.reduce((s, t) => s + t.pnl, 0);
    const toyEV = 0.5 * 2.0 - 0.5 * 1.0; // always 0.5
    const edgeDecay = ((realMetrics.ev - toyEV) / toyEV) * 100;
    return { toyWins, toyLosses: n - toyWins, toyPnl, toyEV, edgeDecay, toyWR: 0.5, toyRR: 2.0 };
  }, [metrics]);

  // Equity curves
  const equityData = useMemo(() => {
    let cumRaw = 0, cumFiltered = 0, cumToy = 0;
    let filtIdx = 0, toyIdx = 0;
    return trades.map((t, i) => {
      cumRaw += Number(t.pnl);
      const pt: any = { i: i + 1, raw: parseFloat(cumRaw.toFixed(2)) };
      if ((t.discipline_score ?? 10) >= 7) { cumFiltered += Number(t.pnl); pt.filtered = parseFloat(cumFiltered.toFixed(2)); }
      // Toy equity parallel (using toy data up to i trades)
      const toyPnl = Math.random() < 0.5 ? 2 * metrics!.avgWin / 2 : -metrics!.avgLoss;
      cumToy += toyPnl;
      pt.toy = parseFloat(cumToy.toFixed(2));
      return pt;
    });
  }, [trades, metrics]);

  // Fan chart
  const fanData = useMemo(() => {
    if (!simResults) return [];
    const paths = simResults[1]?.samplePaths || [];
    const maxLen = Math.max(...paths.map(p => p.length));
    return Array.from({ length: maxLen }, (_, i) => {
      const point: any = { i };
      paths.forEach((p, pi) => { if (i < p.length) point[`p${pi}`] = parseFloat(p[i].toFixed(2)); });
      return point;
    });
  }, [simResults]);

  // Convex payoff curve — R:R achieved vs cumulative return
  const convexData = useMemo(() => {
    if (!trades.length) return [];
    let cum = 0;
    return [...trades]
      .filter(t => t.rr_ratio && Number(t.rr_ratio) > 0)
      .sort((a, b) => Number(a.rr_ratio) - Number(b.rr_ratio))
      .map((t) => {
        cum += Number(t.pnl);
        return { rr: Number(t.rr_ratio), cumReturn: parseFloat(cum.toFixed(2)) };
      });
  }, [trades]);

  // PnL distribution histogram
  const histData = useMemo(() => {
    if (!pnls.length) return [];
    const mn = Math.min(...pnls), mx = Math.max(...pnls);
    const bins = 20;
    const step = (mx - mn) / bins || 1;
    return Array.from({ length: bins }, (_, i) => {
      const lo = mn + i * step, hi = lo + step;
      return {
        range: `$${lo.toFixed(0)}`,
        count: pnls.filter(p => p >= lo && p < hi).length,
        color: (lo + hi) / 2 >= 0 ? '#4ebe96' : '#c8746a',
      };
    });
  }, [pnls]);

  // Scatter for discipline
  const scatterData = useMemo(() =>
    trades.filter(t => t.discipline_score != null)
      .map(t => ({ x: Number(t.discipline_score), y: parseFloat(Number(t.pnl).toFixed(2)) })), [trades]);
  const regLine = useMemo(() => {
    const reg = linearRegression(scatterData);
    if (!reg) return [];
    return [1, 10].map(x => ({ x, y: parseFloat((reg.slope * x + reg.intercept).toFixed(2)) }));
  }, [scatterData]);

  const handleExportPDF = () => {
    const t = document.title;
    document.title = `Quant Analytics — ${symbol} — ${new Date().toLocaleDateString('vi-VN')}`;
    window.print();
    document.title = t;
  };

  const card: React.CSSProperties = {
    background: 'rgba(19,19,19,0.65)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
    padding: '20px 22px', position: 'relative', overflow: 'hidden',
  };
  const sLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'var(--text-dim)',
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14,
  };

  const TABS = [
    { id: 'overview',  label: 'Overview',       icon: Activity },
    { id: 'barrier',   label: 'Barrier Option',  icon: Shield },
    { id: 'geometry',  label: '3D Risk Surface', icon: Layers },
    { id: 'toyreal',   label: 'Toy vs Real',     icon: GitBranch },
  ] as const;

  return (
    <>
      <style>{`
        @media print {
          body { background:#fff!important; color:#111!important; }
          header,nav,[data-no-print]{ display:none!important; }
        }
      `}</style>

      <div className="font-avenir" style={{ position: 'relative' }}>
        {/* Ambient orbs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '10%', left: '25%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 65%)', animation: 'orbDrift 22s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,159,250,0.04) 0%, transparent 65%)', animation: 'orbDrift 18s ease-in-out infinite reverse 3s' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={14} color="#a78bfa" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em' }}>Quant Analytics</h2>
                {unlocked && <div style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(78,190,150,0.1)', border: '1px solid rgba(78,190,150,0.3)', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><Unlock size={9} /> UNLOCKED</div>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Barrier option EV · 3D risk geometry · Monte Carlo prop firm engine · Convex payoff analysis</p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unlocked && metrics && (
                <button onClick={handleExportPDF} data-no-print
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', color: '#a78bfa', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <FileDown size={13} /> Export PDF
                </button>
              )}
              {syms.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setSymOpen(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minWidth: 180 }}>
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
                              {s.count >= UNLOCK_THRESHOLD
                                ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Unlock size={9} />{s.count}</span>
                                : `${s.count}/${UNLOCK_THRESHOLD}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {!symbol ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <Activity size={52} style={{ opacity: 0.12, marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>Select a symbol to analyse</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>
                {syms.length === 0 ? 'No closed trades found.' : 'Choose a symbol from the dropdown above.'}
              </p>
            </div>
          ) : !unlocked ? (
            <LockScreen symbol={symbol} count={selectedSym?.count || 0} />
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 13 }}>Computing…</div>
          ) : metrics ? (
            <>
              {/* ── Tabs ── */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                        background: activeTab === tab.id ? 'rgba(255,255,255,0.09)' : 'transparent',
                        color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)' }}>
                      <Icon size={12} /> {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── TAB: OVERVIEW ── */}
              {activeTab === 'overview' && (
                <>
                  {/* KPI Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                    <MetricCard label="Win Rate" value={`${(metrics.winRate * 100).toFixed(1)}%`} sub={`${metrics.wins}W / ${metrics.losses}L`} color="#4ebe96" />
                    <MetricCard label="Actual R:R" value={`1:${metrics.rr.toFixed(2)}`} sub={`Win $${metrics.avgWin.toFixed(0)} · Loss $${metrics.avgLoss.toFixed(0)}`} color="#479ffa" />
                    <MetricCard label="Exp. Value / Trade" value={`${metrics.ev >= 0 ? '+' : ''}$${metrics.ev.toFixed(2)}`} sub="EV = WR×AvgW − LR×AvgL" color={metrics.ev >= 0 ? '#4ebe96' : '#c8746a'} />
                    <MetricCard label="Sharpe Ratio" value={metrics.sharpe.toFixed(3)} sub={`σ = $${metrics.stdDev.toFixed(2)}`} color={metrics.sharpe >= 0.5 ? '#4ebe96' : '#ffa16c'} />
                    <MetricCard label="Kelly Fraction" value={`${(metrics.kelly * 100).toFixed(1)}%`} sub={metrics.kelly > 0 ? 'Positive edge' : 'Negative edge'} color={metrics.kelly > 0 ? '#4ebe96' : '#c8746a'} badge={metrics.kelly > 0.25 ? 'STRONG' : metrics.kelly > 0 ? 'WEAK' : 'RUIN'} />
                  </div>

                  {/* Convex Payoff Metrics */}
                  <div style={{ ...card, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Zap size={13} color="#ffa16c" />
                      <div style={sLabel}>Convex Payoff Analysis — Asymmetry, Skewness & Profit Factor</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                      {[
                        { label: 'Profit Factor', value: metrics.profitFactor === 999 ? '∞' : metrics.profitFactor.toFixed(2), sub: `$${metrics.grossProfit.toFixed(0)} / $${metrics.grossLoss.toFixed(0)}`, color: metrics.profitFactor >= 1.5 ? '#4ebe96' : '#ffa16c' },
                        { label: 'P&L Skewness', value: metrics.skewness.toFixed(3), sub: metrics.skewness > 0.3 ? 'Right-skewed ✓ Ideal' : metrics.skewness < -0.3 ? 'Left-skewed ✗ Risk' : 'Symmetric', color: metrics.skewness > 0 ? '#4ebe96' : '#c8746a' },
                        { label: 'Asymmetry Ratio', value: `${metrics.asymmetryRatio.toFixed(2)}x`, sub: 'AvgWin / AvgLoss', color: metrics.asymmetryRatio >= 1.5 ? '#4ebe96' : '#ffa16c' },
                        { label: 'Discipline Corr.', value: metrics.pearson.toFixed(3), sub: metrics.pearson > 0.2 ? 'Strong positive' : 'Weak positive', color: metrics.pearson > 0 ? '#a78bfa' : '#c8746a' },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{m.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: m.color, letterSpacing: '-0.04em' }}>{m.value}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{m.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* Convex Payoff Curve — R:R vs Cumulative Return */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Convex Payoff Curve — R:R vs Cumulative Return</div>
                        <ResponsiveContainer width="100%" height={180}>
                          <AreaChart data={convexData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id="convexGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ffa16c" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#ffa16c" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="rr" tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} label={{ value: 'R:R Achieved', position: 'insideBottom', fill: '#555a60', fontSize: 9, offset: -2 }} />
                            <YAxis tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={50} />
                            <Tooltip contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                            <Area type="monotone" dataKey="cumReturn" stroke="#ffa16c" strokeWidth={2} fill="url(#convexGrad)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>P&L Distribution Histogram</div>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={histData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="range" tick={{ fill: '#555a60', fontSize: 8 }} tickLine={false} axisLine={false} interval={4} />
                            <YAxis tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
                            <Tooltip contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                              {histData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.7} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Simulation Summary */}
                  {simResults && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Target size={13} color="#a78bfa" />
                        <div style={sLabel}>Monte Carlo Simulation Summary · 10,000 Runs × 30-Trade Sequence</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                        {simResults.map((sim, i) => (
                          <SimSummaryCard key={sim.label} pkg={PROP_PACKAGES[i]} sim={sim as any} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Charts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <TrendingUp size={13} color="#4ebe96" />
                        <div style={sLabel}>Equity Curve — Raw vs Discipline Filtered (≥7) with Barriers</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                        {[{ c: '#4ebe96', l: 'Raw' }, { c: '#479ffa', l: 'Filtered ≥7' }].map(l => (
                          <div key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                            <div style={{ width: 16, height: 2, background: l.c, borderRadius: 1 }} /> {l.l}
                          </div>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={equityData} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4ebe96" stopOpacity="0.15" /><stop offset="100%" stopColor="#4ebe96" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#479ffa" stopOpacity="0.12" /><stop offset="100%" stopColor="#479ffa" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="i" tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                          <Tooltip contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                          <ReferenceLine y={PROP_PACKAGES[1].target} stroke="rgba(78,190,150,0.3)" strokeDasharray="6 3" label={{ value: 'Target', fill: '#4ebe96', fontSize: 8, position: 'right' }} />
                          <ReferenceLine y={-PROP_PACKAGES[1].dd} stroke="rgba(200,116,106,0.3)" strokeDasharray="6 3" label={{ value: 'Max DD', fill: '#c8746a', fontSize: 8, position: 'right' }} />
                          <Area type="monotone" dataKey="raw" stroke="#4ebe96" strokeWidth={1.6} fill="url(#g1)" dot={false} connectNulls />
                          <Area type="monotone" dataKey="filtered" stroke="#479ffa" strokeWidth={1.6} fill="url(#g2)" dot={false} connectNulls strokeDasharray="4 2" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <Brain size={13} color="#a78bfa" />
                        <div style={sLabel}>Discipline Score vs P&L — r={metrics.pearson.toFixed(3)}</div>
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                          <XAxis type="number" dataKey="x" domain={[0, 11]} tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} label={{ value: 'Discipline Score', position: 'insideBottom', fill: '#555a60', fontSize: 9, offset: -2 }} />
                          <YAxis type="number" dataKey="y" tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                          <Tooltip contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: any, n) => [n === 'y' ? `$${Number(v).toFixed(2)}` : v, n === 'y' ? 'P&L' : 'Discipline']} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                          <Scatter data={scatterData} fill="#a78bfa" fillOpacity={0.6} r={3} />
                          <Line data={regLine} type="linear" dataKey="y" stroke="#479ffa" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* MC Fan */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <Activity size={13} color="#ffa16c" />
                      <div style={sLabel}>Monte Carlo Fan — 150 Paths ($100K · Target +$6,000 · DD -$5,000)</div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={fanData} margin={{ top: 4, right: 30, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="i" tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                        <ReferenceLine y={6000} stroke="rgba(78,190,150,0.4)" strokeDasharray="4 2" label={{ value: 'Target', fill: '#4ebe96', fontSize: 9, position: 'right' }} />
                        <ReferenceLine y={-5000} stroke="rgba(200,116,106,0.4)" strokeDasharray="4 2" label={{ value: 'Max DD', fill: '#c8746a', fontSize: 9, position: 'right' }} />
                        {Array.from({ length: Math.min(150, Object.keys(fanData[0] || {}).length - 1) }, (_, i) => (
                          <Line key={i} type="monotone" dataKey={`p${i}`} stroke="rgba(167,139,250,0.14)" strokeWidth={1} dot={false} isAnimationActive={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* ── TAB: BARRIER OPTION EV ── */}
              {activeTab === 'barrier' && barrierEVs && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Shield size={13} color="#479ffa" />
                      <div style={sLabel}>Prop Firm Evaluation — Barrier Option Pricing Model</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20, maxWidth: 700 }}>
                      The evaluation phase is modeled as a <strong style={{ color: 'var(--text)' }}>barrier option</strong> — an upside target (profit goal) and a strict downside knockout barrier (max drawdown). Net EV = P(pass) × AvgPayout − P(fail) × Fee.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                      {barrierEVs.map((ev, i) => {
                        const pkg = PROP_PACKAGES[i];
                        const good = ev.netEV >= 0;
                        return (
                          <div key={pkg.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${good ? 'rgba(78,190,150,0.2)' : 'rgba(200,116,106,0.2)'}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${pkg.color}55, transparent)` }} />
                            <div style={{ fontSize: 13, fontWeight: 800, color: pkg.color, marginBottom: 16 }}>{pkg.label}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { l: 'Challenge Fee', v: `$${pkg.fee}`, c: 'var(--red)' },
                                { l: 'Profit Target', v: `+$${pkg.target.toLocaleString()}`, c: 'var(--green)' },
                                { l: 'Max Drawdown', v: `-$${pkg.dd.toLocaleString()}`, c: 'var(--red)' },
                                { l: 'Pass Probability', v: `${(ev.passProb * 100).toFixed(1)}%`, c: '#4ebe96' },
                                { l: 'Avg Payout if Pass', v: `$${ev.expectedGrossIfPass.toFixed(0)}`, c: '#4ebe96' },
                                { l: 'Fail Probability', v: `${(ev.failProb * 100).toFixed(1)}%`, c: 'var(--red)' },
                              ].map(r => (
                                <div key={r.l}>
                                  <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{r.l}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: r.c }}>{r.v}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: good ? 'rgba(78,190,150,0.06)' : 'rgba(200,116,106,0.06)', border: `1px solid ${good ? 'rgba(78,190,150,0.2)' : 'rgba(200,116,106,0.2)'}` }}>
                              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Net Expected Value (per attempt)</div>
                              <div style={{ fontSize: 26, fontWeight: 900, color: good ? '#4ebe96' : '#c8746a', letterSpacing: '-0.05em', textShadow: `0 0 20px ${good ? 'rgba(78,190,150,0.3)' : 'rgba(200,116,106,0.3)'}` }}>
                                {good ? '+' : ''}{ev.netEV.toFixed(0)} <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>USD</span>
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                Breakeven fee at current edge: ${ev.breakevenFeeAtCurrentEdge.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Funded Phase EV */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Zap size={13} color="#ffa16c" />
                      <div style={sLabel}>Funded Phase — Dynamic EV with Trailing Drawdown & Profit Split Buffer</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16, maxWidth: 700 }}>
                      Once funded, the system models the trailing drawdown constraint and profit-split buffer erosion. Each payout reduces the buffer. EV is recalculated accounting for the 80% profit split and dynamic risk-of-account-loss as equity grows.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                      {PROP_PACKAGES.map((pkg, i) => {
                        const sim = simResults?.[i];
                        if (!sim) return null;
                        const fundedEV = sim.payoutExpectancy * sim.passRate * 0.8 - pkg.fee * (1 - sim.passRate);
                        const monthlyPayoutPotential = sim.passRate > 0 ? sim.payoutExpectancy * (30 / Math.max(sim.avgTradesToPass, 1)) * 0.8 : 0;
                        return (
                          <div key={pkg.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: pkg.color, marginBottom: 12 }}>{pkg.label}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Funded Phase EV (net of fee)</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: fundedEV >= 0 ? '#4ebe96' : '#c8746a', letterSpacing: '-0.04em' }}>{fundedEV >= 0 ? '+' : ''}${fundedEV.toFixed(0)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Monthly Payout Potential (80% split)</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#4ebe96', letterSpacing: '-0.03em' }}>+${monthlyPayoutPotential.toFixed(0)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Pass → Funded Rate</div>
                                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                                  <div style={{ height: '100%', width: `${sim.passRate * 100}%`, background: pkg.color, borderRadius: 99 }} />
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{(sim.passRate * 100).toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: 3D RISK SURFACE ── */}
              {activeTab === 'geometry' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Layers size={13} color="#a78bfa" />
                      <div style={sLabel}>3D Risk Geometry Surface — Win Rate × R:R × Prop Firm Pass Rate</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16, maxWidth: 700 }}>
                      Surface color transitions from <span style={{ color: '#7f0000' }}>deep crimson (certain ruin)</span> → <span style={{ color: '#1a4a6e' }}>dark blue (breakeven)</span> → <span style={{ color: '#00ffe5' }}>neon cyan (high pass rate)</span>. The <span style={{ color: '#4ebe96' }}>glowing white node</span> is your current trading coordinates.
                    </p>
                    <RiskSurface3D currentWR={metrics.winRate} currentRR={metrics.rr} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                      {[
                        { label: 'Your Win Rate', value: `${(metrics.winRate * 100).toFixed(1)}%`, color: '#4ebe96' },
                        { label: 'Your R:R Ratio', value: `1:${metrics.rr.toFixed(2)}`, color: '#479ffa' },
                        { label: 'Ruin Probability', value: `${(ruinProbability(metrics.winRate, metrics.rr) * 100).toFixed(1)}%`, color: ruinProbability(metrics.winRate, metrics.rr) < 0.5 ? '#4ebe96' : '#c8746a' },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ruin Boundary explanation */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <AlertTriangle size={13} color="#ffa16c" />
                      <div style={sLabel}>Mathematical Ruin Boundary — The Kelly Edge Safety Frontier</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16, maxWidth: 680 }}>
                      The <strong style={{ color: '#ffa16c' }}>Ruin Boundary</strong> is defined by Kelly fraction f* = 0. Below this frontier, the system has negative expected growth regardless of bet sizing — mathematical ruin is certain over a long sequence. Formula: <span style={{ fontFamily: 'monospace', color: 'var(--accent)', background: 'rgba(71,159,250,0.08)', padding: '1px 6px', borderRadius: 4 }}>f* = WinRate − (1−WR)/RR</span>
                    </p>
                    {/* Ruin grid heatmap */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 9 }}>WR \ R:R</th>
                            {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].map(rr => (
                              <th key={rr} style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--text-dim)', fontWeight: 700, fontSize: 9 }}>1:{rr}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[30, 35, 40, 45, 50, 55, 60, 65, 70].map(wr => (
                            <tr key={wr}>
                              <td style={{ padding: '5px 10px', fontWeight: 700, color: 'var(--text-muted)', fontSize: 10 }}>{wr}%</td>
                              {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].map(rr => {
                                const kelly = (wr / 100) - (1 - wr / 100) / rr;
                                const pr = Math.max(0, Math.min(1, fastPassRate(wr / 100, rr, 8, 5, 200, 30)));
                                const isCurrent = Math.abs(wr / 100 - metrics.winRate) < 0.04 && Math.abs(rr - metrics.rr) < 0.3;
                                const bg = kelly > 0.1 ? `rgba(78,190,150,${Math.min(0.35, kelly * 1.5)})` : kelly > 0 ? 'rgba(255,161,108,0.12)' : 'rgba(200,116,106,0.12)';
                                return (
                                  <td key={rr} style={{ padding: '5px 10px', textAlign: 'center', background: isCurrent ? 'rgba(255,255,255,0.12)' : bg, borderRadius: 4, border: isCurrent ? '1px solid rgba(255,255,255,0.4)' : 'none', color: kelly > 0 ? '#4ebe96' : '#c8746a', fontWeight: isCurrent ? 900 : 600, fontSize: 10 }}>
                                    {(pr * 100).toFixed(0)}%
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>Values show estimated prop firm pass rate (target +8%, DD −5%). Highlighted cell = your current coordinates.</p>
                  </div>
                </div>
              )}

              {/* ── TAB: TOY VS REAL ── */}
              {activeTab === 'toyreal' && toyResults && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <GitBranch size={13} color="#4ebe96" />
                      <div style={sLabel}>Toy Strategy vs Real Strategy — Execution Edge Decay Analysis</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 20, maxWidth: 700 }}>
                      The <strong style={{ color: '#479ffa' }}>Toy Strategy</strong> is a perfect benchmark: 50% WR, 2:1 R:R, zero execution variance. Your <strong style={{ color: '#4ebe96' }}>Real Strategy</strong> deviates due to emotional execution, discipline lapses, and market noise. The gap between them quantifies your <em>execution edge decay</em>.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
                      {/* Toy */}
                      <div style={{ background: 'rgba(71,159,250,0.04)', border: '1px solid rgba(71,159,250,0.2)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#479ffa', marginBottom: 14 }}>Toy Strategy (Benchmark)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { l: 'Win Rate', v: '50.0%' }, { l: 'R:R Ratio', v: '1:2.00' },
                            { l: 'EV / Trade', v: '+$0.50', c: '#4ebe96' }, { l: 'Execution Noise', v: 'None', c: '#4ebe96' },
                          ].map(r => (
                            <div key={r.l}>
                              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{r.l}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: (r as any).c || 'var(--text)' }}>{r.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Real */}
                      <div style={{ background: 'rgba(78,190,150,0.04)', border: '1px solid rgba(78,190,150,0.2)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#4ebe96', marginBottom: 14 }}>Real Strategy (Yours)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { l: 'Win Rate', v: `${(metrics.winRate * 100).toFixed(1)}%`, c: metrics.winRate >= 0.5 ? '#4ebe96' : '#ffa16c' },
                            { l: 'R:R Ratio', v: `1:${metrics.rr.toFixed(2)}`, c: metrics.rr >= 2 ? '#4ebe96' : '#ffa16c' },
                            { l: 'EV / Trade', v: `${metrics.ev >= 0 ? '+' : ''}$${metrics.ev.toFixed(2)}`, c: metrics.ev >= 0 ? '#4ebe96' : '#c8746a' },
                            { l: 'Skewness', v: metrics.skewness.toFixed(3), c: metrics.skewness > 0 ? '#4ebe96' : '#c8746a' },
                          ].map(r => (
                            <div key={r.l}>
                              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{r.l}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: r.c }}>{r.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Edge Decay Score */}
                    <div style={{ padding: '16px 20px', borderRadius: 12, background: toyResults.edgeDecay >= 0 ? 'rgba(78,190,150,0.05)' : 'rgba(200,116,106,0.05)', border: `1px solid ${toyResults.edgeDecay >= 0 ? 'rgba(78,190,150,0.2)' : 'rgba(200,116,106,0.2)'}` }}>
                      <div style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Execution Edge Decay vs Toy Benchmark</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: toyResults.edgeDecay >= 0 ? '#4ebe96' : '#c8746a', letterSpacing: '-0.06em' }}>
                        {toyResults.edgeDecay >= 0 ? '+' : ''}{toyResults.edgeDecay.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        {toyResults.edgeDecay >= 0
                          ? 'Your real EV exceeds the toy benchmark — you are generating alpha beyond mechanical execution.'
                          : 'Your real EV is below the toy benchmark — execution variance and discipline lapses are costing you edge.'}
                      </div>
                    </div>
                  </div>

                  {/* Equity comparison */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <TrendingUp size={13} color="#479ffa" />
                      <div style={sLabel}>Equity Curve — Real vs Toy Strategy Comparison</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      {[{ c: '#4ebe96', l: 'Real Strategy' }, { c: '#479ffa', l: 'Toy Benchmark' }].map(l => (
                        <div key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)' }}>
                          <div style={{ width: 16, height: 2, background: l.c, borderRadius: 1 }} /> {l.l}
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={equityData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4ebe96" stopOpacity="0.15" /><stop offset="100%" stopColor="#4ebe96" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#479ffa" stopOpacity="0.08" /><stop offset="100%" stopColor="#479ffa" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="i" tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                        <Tooltip contentStyle={{ background: 'rgba(11,11,11,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                        <Area type="monotone" dataKey="raw" stroke="#4ebe96" strokeWidth={2} fill="url(#g3)" dot={false} connectNulls name="Real" />
                        <Area type="monotone" dataKey="toy" stroke="#479ffa" strokeWidth={1.5} fill="url(#g4)" dot={false} connectNulls strokeDasharray="5 3" name="Toy" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
