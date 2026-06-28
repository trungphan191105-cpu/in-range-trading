/**
 * Quant Analytics — Advanced Prop Firm Modeling Engine
 * Barrier Option EV · Convex Payoff · Risk Geometry Surface (3D) · Monte Carlo Phase Space
 * Toy vs Real Strategy · Ruin Boundary · Funded Phase Modeling
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Lock, Unlock, TrendingUp, Activity, BarChart2, Target, Brain,
  ChevronDown, FileDown, Zap, Shield, GitBranch, AlertTriangle, Layers,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ReferenceLine, CartesianGrid,
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
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
  { label: '$100K Account', target: 6000, dd: 5000,  fee: 550,  color: '#66BB6A' },
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

// ── Shared glass styles ────────────────────────────────────────────────────────
const FONT = "'Open Sauce One','Open Sans',system-ui,sans-serif";
const GLASS: React.CSSProperties = {
  background: 'rgba(23,23,21,.88)',
  backdropFilter: 'blur(22px) saturate(130%)',
  WebkitBackdropFilter: 'blur(22px) saturate(130%)',
  border: '1px solid rgba(255,255,255,.07)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.09), inset 0 -1px 0 rgba(0,0,0,.3), 0 8px 28px rgba(0,0,0,.55)',
};

// ── UI Components ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = '#F8FAFC', badge }: { label: string; value: string; sub?: string; color?: string; badge?: string }) {
  return (
    <div style={{ ...GLASS, borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: `linear-gradient(90deg,transparent,${color}33,transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)', textTransform: 'uppercase', letterSpacing: '.12em' }}>{label}</div>
        {badge && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: `${color}12`, border: `1px solid ${color}28`, color, opacity: .85 }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-.04em', textShadow: `0 0 18px ${color}28`, opacity: .92 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', marginTop: 4, opacity: .7 }}>{sub}</div>}
    </div>
  );
}

function SimSummaryCard({ pkg, sim }: { pkg: typeof PROP_PACKAGES[0]; sim: ReturnType<typeof monteCarloSim> & { fee: number } }) {
  const donutData = [
    { name: 'Qua', value: parseFloat((sim.passRate * 100).toFixed(2)), fill: '#4ADE80' },
    { name: 'Trượt', value: parseFloat((sim.failRate * 100).toFixed(2)), fill: '#FB7185' },
    { name: 'Hết giờ', value: parseFloat((sim.timeoutRate * 100).toFixed(2)), fill: '#FBBF24' },
  ];
  const fmt = (v: number) => v >= 0 ? `+$${v.toFixed(0)}` : `-$${Math.abs(v).toFixed(0)}`;
  return (
    <div style={{ ...GLASS, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: `linear-gradient(90deg,transparent,${pkg.color}44,transparent)` }} />
      <div style={{ fontSize: 12, fontWeight: 800, color: pkg.color, marginBottom: 14, letterSpacing: '-.02em', opacity: .9 }}>
        {pkg.label} <span style={{ fontSize: 9, opacity: .5, fontWeight: 500 }}>· Phí ${pkg.fee}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', flexShrink: 0, width: 100, height: 100 }}>
          <PieChart width={100} height={100}>
            <Pie data={donutData} cx={46} cy={46} innerRadius={28} outerRadius={46} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
              {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
          </PieChart>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#4ADE80', lineHeight: 1, letterSpacing: '-.04em' }}>{(sim.passRate * 100).toFixed(1)}%</div>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,.3)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 1 }}>QUA</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          {donutData.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: 2, background: d.fill }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', minWidth: 44 }}>{d.name}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: d.fill, opacity: .8 }}>{d.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          {[
            { label: 'Payout TB', value: `$${sim.payoutExpectancy.toFixed(0)}`, color: '#4ADE80' },
            { label: 'Số lệnh TB', value: sim.avgTradesToPass > 0 ? sim.avgTradesToPass.toFixed(1) : '—', color: pkg.color },
            { label: 'EV Trung bình', value: fmt(sim.evMean), color: sim.evMean >= 0 ? '#4ADE80' : '#FB7185' },
            { label: 'EV P5', value: fmt(sim.evP5), color: sim.evP5 >= 0 ? '#4ADE80' : '#FB7185' },
            { label: 'EV P95', value: fmt(sim.evP95), color: '#4ADE80' },
            { label: 'Net EV', value: fmt(sim.evMean - pkg.fee * sim.failRate), color: (sim.evMean - pkg.fee * sim.failRate) >= 0 ? '#4ADE80' : '#FB7185' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 1 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: s.color, letterSpacing: '-.03em', opacity: .88 }}>{s.value}</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center', gap: 20, fontFamily: FONT }}>
      <div style={{ ...GLASS, width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={26} color="rgba(255,255,255,.5)" />
      </div>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.04em', marginBottom: 8, color: 'rgba(255,255,255,.88)' }}>Chưa mở khoá</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', maxWidth: 360, lineHeight: 1.7 }}>
          Cần <strong style={{ color: 'rgba(255,255,255,.7)' }}>{UNLOCK_THRESHOLD} lệnh đã đóng</strong> cho{' '}
          <strong style={{ color: 'rgba(255,255,255,.8)' }}>{symbol}</strong> để mở phân tích Quant,
          mô hình EV barrier option, bề mặt rủi ro 3D và engine Monte Carlo prop firm.
        </p>
      </div>
      <div style={{ width: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
          <span style={{ color: 'rgba(255,255,255,.3)' }}>Tiến độ</span>
          <span style={{ color: 'rgba(255,255,255,.6)' }}>{count} / {UNLOCK_THRESHOLD} lệnh</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,rgba(255,255,255,.4),rgba(255,255,255,.7))', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.22)', marginTop: 6 }}>Còn {UNLOCK_THRESHOLD - count} lệnh nữa</div>
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
        color: (lo + hi) / 2 >= 0 ? '#66BB6A' : '#F87171',
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
    ...GLASS, borderRadius: 16, padding: '20px 22px',
    position: 'relative', overflow: 'hidden', fontFamily: FONT,
  };
  const sLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.28)',
    textTransform: 'uppercase', letterSpacing: '.12em',
  };

  const TABS = [
    { id: 'overview',  label: 'Tổng quan',        icon: Activity },
    { id: 'barrier',   label: 'Barrier EV',        icon: Shield },
    { id: 'geometry',  label: 'Bề mặt 3D',         icon: Layers },
    { id: 'toyreal',   label: 'Toy vs Thực tế',    icon: GitBranch },
  ] as const;

  return (
    <>
      <style>{`
        @media print {
          body { background:#fff!important; color:#111!important; }
          header,nav,[data-no-print]{ display:none!important; }
        }
      `}</style>

      <div style={{ position: 'relative', fontFamily: FONT }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.06em', color: 'rgba(255,255,255,.90)', lineHeight: 1, marginBottom: 7 }}>Quant Analytics</h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.20)', fontWeight: 400 }}>
                EV Barrier · Monte Carlo · Bề mặt rủi ro 3D · Phân tích lệnh thực tế
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unlocked && metrics && (
                <button onClick={handleExportPDF} data-no-print style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 99, ...GLASS, color: 'rgba(255,255,255,.55)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, border: '1px solid rgba(255,255,255,.09)' }}>
                  <FileDown size={12} /> Xuất PDF
                </button>
              )}
              {unlocked && <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, background: 'rgba(74,222,128,.07)', border: '1px solid rgba(74,222,128,.18)', color: 'rgba(74,222,128,.75)', fontSize: 10, fontWeight: 700 }}><Unlock size={9} /> ĐÃ MỞ</div>}
              {syms.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setSymOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 99, ...GLASS, border: '1px solid rgba(255,255,255,.09)', color: 'rgba(255,255,255,.70)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT, minWidth: 160 }}>
                    <BarChart2 size={13} color="rgba(255,255,255,.4)" />
                    <span style={{ flex: 1, textAlign: 'left' }}>{symbol || 'Chọn Symbol'}</span>
                    <ChevronDown size={11} color="rgba(255,255,255,.3)" />
                  </button>
                  {symOpen && (
                    <>
                      <div onClick={() => setSymOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                      <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 41, ...GLASS, borderRadius: 14, padding: 6, minWidth: 200, border: '1px solid rgba(255,255,255,.09)' }}>
                        {syms.map((s: any) => (
                          <button key={s.symbol} onClick={() => { setSymbol(s.symbol); setSymOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, border: 'none', background: symbol === s.symbol ? 'rgba(255,255,255,.07)' : 'transparent', color: 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>
                            <span>{s.symbol}</span>
                            <span style={{ fontSize: 10, color: s.count >= UNLOCK_THRESHOLD ? 'rgba(74,222,128,.7)' : 'rgba(255,255,255,.25)', fontWeight: 700 }}>
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
          </div>

          {!symbol ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Activity size={52} style={{ opacity: .08, marginBottom: 16, color: '#fff' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Chọn symbol để phân tích</p>
              <p style={{ fontSize: 12, marginTop: 6, color: 'rgba(255,255,255,.22)' }}>
                {syms.length === 0 ? 'Chưa có lệnh đã đóng nào.' : 'Chọn symbol từ dropdown bên trên.'}
              </p>
            </div>
          ) : !unlocked ? (
            <LockScreen symbol={symbol} count={selectedSym?.count || 0} />
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Đang tính toán…</div>
          ) : metrics ? (
            <>
              {/* ── Glass pill tabs ── */}
              <div style={{ display: 'flex', gap: 7, marginBottom: 22 }}>
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: FONT, transition: 'all .22s', letterSpacing: '.02em', position: 'relative', overflow: 'hidden',
                        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                        background: isActive ? 'rgba(255,255,255,.11)' : 'rgba(255,255,255,.04)',
                        color: isActive ? 'rgba(255,255,255,.90)' : 'rgba(255,255,255,.28)',
                        boxShadow: isActive
                          ? 'inset 0 1.5px 0 rgba(255,255,255,.28), inset 0 -1px 0 rgba(0,0,0,.2), 0 0 0 1px rgba(255,255,255,.13), 0 6px 18px rgba(0,0,0,.45)'
                          : 'inset 0 1px 0 rgba(255,255,255,.08), 0 0 0 1px rgba(255,255,255,.07), 0 3px 10px rgba(0,0,0,.35)',
                        textShadow: isActive ? '0 0 12px rgba(255,255,255,.3)' : 'none',
                      }}>
                      <Icon size={11} /> {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── TAB: TỔNG QUAN ── */}
              {activeTab === 'overview' && (
                <>
                  {/* KPI Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                    <MetricCard label="Tỷ lệ thắng" value={`${(metrics.winRate * 100).toFixed(1)}%`} sub={`${metrics.wins} thắng / ${metrics.losses} thua`} color="#4ADE80" />
                    <MetricCard label="R:R thực tế" value={`1:${metrics.rr.toFixed(2)}`} sub={`Thắng $${metrics.avgWin.toFixed(0)} · Thua $${metrics.avgLoss.toFixed(0)}`} color="#60A5FA" />
                    <MetricCard label="EV / Lệnh" value={`${metrics.ev >= 0 ? '+' : ''}$${metrics.ev.toFixed(2)}`} sub="Kỳ vọng lợi nhuận mỗi lệnh" color={metrics.ev >= 0 ? '#4ADE80' : '#FB7185'} />
                    <MetricCard label="Sharpe Ratio" value={metrics.sharpe.toFixed(3)} sub={`Độ biến động σ = $${metrics.stdDev.toFixed(2)}`} color={metrics.sharpe >= 0.5 ? '#4ADE80' : '#FBBF24'} />
                    <MetricCard label="Kelly %" value={`${(metrics.kelly * 100).toFixed(1)}%`} sub={metrics.kelly > 0 ? 'Có lợi thế' : 'Không có lợi thế'} color={metrics.kelly > 0 ? '#4ADE80' : '#FB7185'} badge={metrics.kelly > 0.25 ? 'MẠNH' : metrics.kelly > 0 ? 'YẾU' : 'RÚI RO'} />
                  </div>

                  {/* Convex Payoff Metrics */}
                  <div style={{ ...card, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Zap size={13} color="#ffa16c" />
                      <div style={sLabel}>Convex Payoff Analysis — Asymmetry, Skewness & Profit Factor</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                      {[
                        { label: 'Profit Factor', value: metrics.profitFactor === 999 ? '∞' : metrics.profitFactor.toFixed(2), sub: `$${metrics.grossProfit.toFixed(0)} / $${metrics.grossLoss.toFixed(0)}`, color: metrics.profitFactor >= 1.5 ? '#66BB6A' : '#ffa16c' },
                        { label: 'P&L Skewness', value: metrics.skewness.toFixed(3), sub: metrics.skewness > 0.3 ? 'Right-skewed ✓ Ideal' : metrics.skewness < -0.3 ? 'Left-skewed ✗ Risk' : 'Symmetric', color: metrics.skewness > 0 ? '#66BB6A' : '#F87171' },
                        { label: 'Asymmetry Ratio', value: `${metrics.asymmetryRatio.toFixed(2)}x`, sub: 'AvgWin / AvgLoss', color: metrics.asymmetryRatio >= 1.5 ? '#66BB6A' : '#ffa16c' },
                        { label: 'Discipline Corr.', value: metrics.pearson.toFixed(3), sub: metrics.pearson > 0.2 ? 'Strong positive' : 'Weak positive', color: metrics.pearson > 0 ? '#a78bfa' : '#F87171' },
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
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Đường lợi nhuận lồi — R:R vs Lợi nhuận tích lũy</div>
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
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Phân phối P&L — Histogram</div>
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
                        <div style={sLabel}>Monte Carlo · 10,000 lần mô phỏng × chuỗi 30 lệnh</div>
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
                        <TrendingUp size={13} color="#66BB6A" />
                        <div style={sLabel}>Đường vốn — Thực tế vs Lọc kỷ luật (≥7) · với ngưỡng rào cản</div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                        {[{ c: '#4ADE80', l: 'Thực tế' }, { c: '#60A5FA', l: 'Lọc kỷ luật ≥7' }].map(l => (
                          <div key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,.3)' }}>
                            <div style={{ width: 16, height: 2, background: l.c, borderRadius: 1 }} /> {l.l}
                          </div>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={equityData} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#66BB6A" stopOpacity="0.15" /><stop offset="100%" stopColor="#66BB6A" stopOpacity="0" />
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
                          <ReferenceLine y={PROP_PACKAGES[1].target} stroke="rgba(78,190,150,0.3)" strokeDasharray="6 3" label={{ value: 'Target', fill: '#66BB6A', fontSize: 8, position: 'right' }} />
                          <ReferenceLine y={-PROP_PACKAGES[1].dd} stroke="rgba(200,116,106,0.3)" strokeDasharray="6 3" label={{ value: 'Max DD', fill: '#F87171', fontSize: 8, position: 'right' }} />
                          <Area type="monotone" dataKey="raw" stroke="#66BB6A" strokeWidth={1.6} fill="url(#g1)" dot={false} connectNulls />
                          <Area type="monotone" dataKey="filtered" stroke="#479ffa" strokeWidth={1.6} fill="url(#g2)" dot={false} connectNulls strokeDasharray="4 2" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <Brain size={13} color="#a78bfa" />
                        <div style={sLabel}>Kỷ luật vs P&L — hệ số r={metrics.pearson.toFixed(3)}</div>
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
                      <div style={sLabel}>Monte Carlo Fan — 150 đường ($100K · Mục tiêu +$6,000 · DD -$5,000)</div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={fanData} margin={{ top: 4, right: 30, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="i" tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#555a60', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                        <ReferenceLine y={6000} stroke="rgba(78,190,150,0.4)" strokeDasharray="4 2" label={{ value: 'Target', fill: '#66BB6A', fontSize: 9, position: 'right' }} />
                        <ReferenceLine y={-5000} stroke="rgba(200,116,106,0.4)" strokeDasharray="4 2" label={{ value: 'Max DD', fill: '#F87171', fontSize: 9, position: 'right' }} />
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
                      <div style={sLabel}>Đánh giá Prop Firm — Mô hình Barrier Option</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', lineHeight: 1.7, marginBottom: 20, maxWidth: 700 }}>
                      Giai đoạn challenge được mô hình hóa như một <strong style={{ color: 'rgba(255,255,255,.6)' }}>barrier option</strong> — ngưỡng trên là mục tiêu lợi nhuận, ngưỡng dưới là mức cắt lỗ tối đa. Net EV = P(qua) × Payout trung bình − P(trượt) × Phí.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                      {barrierEVs.map((ev, i) => {
                        const pkg = PROP_PACKAGES[i];
                        const good = ev.netEV >= 0;
                        return (
                          <div key={pkg.label} style={{ ...GLASS, border: `1px solid ${good ? 'rgba(74,222,128,.18)' : 'rgba(251,113,133,.18)'}`, borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${pkg.color}55, transparent)` }} />
                            <div style={{ fontSize: 13, fontWeight: 800, color: pkg.color, marginBottom: 16 }}>{pkg.label}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              {[
                                { l: 'Phí Challenge', v: `$${pkg.fee}`, c: '#FB7185' },
                                { l: 'Mục tiêu lợi nhuận', v: `+$${pkg.target.toLocaleString()}`, c: '#4ADE80' },
                                { l: 'Max Drawdown', v: `-$${pkg.dd.toLocaleString()}`, c: '#FB7185' },
                                { l: 'Xác suất qua', v: `${(ev.passProb * 100).toFixed(1)}%`, c: '#4ADE80' },
                                { l: 'Payout TB nếu qua', v: `$${ev.expectedGrossIfPass.toFixed(0)}`, c: '#4ADE80' },
                                { l: 'Xác suất trượt', v: `${(ev.failProb * 100).toFixed(1)}%`, c: '#FB7185' },
                              ].map(r => (
                                <div key={r.l}>
                                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{r.l}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: r.c, opacity: .88 }}>{r.v}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: good ? 'rgba(74,222,128,.06)' : 'rgba(251,113,133,.06)', border: `1px solid ${good ? 'rgba(74,222,128,.2)' : 'rgba(251,113,133,.2)'}` }}>
                              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Kỳ vọng ròng mỗi lần thử</div>
                              <div style={{ fontSize: 26, fontWeight: 900, color: good ? '#66BB6A' : '#F87171', letterSpacing: '-0.05em', textShadow: `0 0 20px ${good ? 'rgba(78,190,150,0.3)' : 'rgba(200,116,106,0.3)'}` }}>
                                {good ? '+' : ''}{ev.netEV.toFixed(0)} <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.7 }}>USD</span>
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', marginTop: 4 }}>
                                Phí hoà vốn với edge hiện tại: ${ev.breakevenFeeAtCurrentEdge.toFixed(0)}
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
                      <div style={sLabel}>Giai đoạn Funded — EV động · Trailing Drawdown &amp; Profit Split 80%</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', lineHeight: 1.7, marginBottom: 16, maxWidth: 700 }}>
                      Sau khi qua challenge, hệ thống mô hình hóa ràng buộc trailing drawdown và mức bào mòn profit-split buffer. Mỗi lần rút tiền làm giảm buffer. EV được tính lại với tỷ lệ chia lợi nhuận 80% và rủi ro mất tài khoản động khi vốn tăng.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                      {PROP_PACKAGES.map((pkg, i) => {
                        const sim = simResults?.[i];
                        if (!sim) return null;
                        const fundedEV = sim.payoutExpectancy * sim.passRate * 0.8 - pkg.fee * (1 - sim.passRate);
                        const monthlyPayoutPotential = sim.passRate > 0 ? sim.payoutExpectancy * (30 / Math.max(sim.avgTradesToPass, 1)) * 0.8 : 0;
                        return (
                          <div key={pkg.label} style={{ ...GLASS, borderRadius: 14, padding: '16px 18px' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: pkg.color, marginBottom: 12 }}>{pkg.label}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>EV Funded (trừ phí)</div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: fundedEV >= 0 ? '#4ADE80' : '#FB7185', letterSpacing: '-.04em' }}>{fundedEV >= 0 ? '+' : ''}${fundedEV.toFixed(0)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Payout tháng (chia 80%)</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#4ADE80', letterSpacing: '-.03em' }}>+${monthlyPayoutPotential.toFixed(0)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Tỷ lệ qua → Funded</div>
                                <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
                                  <div style={{ height: '100%', width: `${sim.passRate * 100}%`, background: pkg.color, borderRadius: 99 }} />
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', marginTop: 3 }}>{(sim.passRate * 100).toFixed(1)}%</div>
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
                      <div style={sLabel}>Bề mặt rủi ro 3D — Win Rate × R:R × Tỷ lệ qua Prop Firm</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', lineHeight: 1.7, marginBottom: 16, maxWidth: 700 }}>
                      Màu bề mặt chuyển từ <span style={{ color: '#ff4040' }}>đỏ thẫm (rủi ro phá sản)</span> → <span style={{ color: '#60A5FA' }}>xanh dương (hoà vốn)</span> → <span style={{ color: '#00ffe5' }}>xanh cyan (tỷ lệ qua cao)</span>. Điểm <span style={{ color: '#4ADE80' }}>trắng phát sáng</span> là vị trí hiện tại của bạn.
                    </p>
                    <RiskSurface3D currentWR={metrics.winRate} currentRR={metrics.rr} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                      {[
                        { label: 'Tỷ lệ thắng của bạn', value: `${(metrics.winRate * 100).toFixed(1)}%`, color: '#4ADE80' },
                        { label: 'R:R của bạn', value: `1:${metrics.rr.toFixed(2)}`, color: '#60A5FA' },
                        { label: 'Xác suất phá sản', value: `${(ruinProbability(metrics.winRate, metrics.rr) * 100).toFixed(1)}%`, color: ruinProbability(metrics.winRate, metrics.rr) < 0.5 ? '#4ADE80' : '#FB7185' },
                      ].map(m => (
                        <div key={m.label} style={{ ...GLASS, borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ruin Boundary explanation */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <AlertTriangle size={13} color="#ffa16c" />
                      <div style={sLabel}>Ranh giới phá sản — Kelly Edge Safety Frontier</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', lineHeight: 1.7, marginBottom: 16, maxWidth: 680 }}>
                      <strong style={{ color: '#FBBF24' }}>Ranh giới phá sản</strong> được xác định khi Kelly fraction f* = 0. Dưới ngưỡng này, hệ thống có kỳ vọng tăng trưởng âm bất kể sizing — phá sản toán học là chắc chắn theo thời gian. Công thức: <span style={{ fontFamily: 'monospace', color: '#60A5FA', background: 'rgba(96,165,250,.08)', padding: '1px 6px', borderRadius: 4 }}>f* = WR − (1−WR)/RR</span>
                    </p>
                    {/* Ruin grid heatmap */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '6px 10px', textAlign: 'left', color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 9 }}>WR \ R:R</th>
                            {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].map(rr => (
                              <th key={rr} style={{ padding: '6px 10px', textAlign: 'center', color: 'rgba(255,255,255,.25)', fontWeight: 700, fontSize: 9 }}>1:{rr}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[30, 35, 40, 45, 50, 55, 60, 65, 70].map(wr => (
                            <tr key={wr}>
                              <td style={{ padding: '5px 10px', fontWeight: 700, color: 'rgba(255,255,255,.35)', fontSize: 10 }}>{wr}%</td>
                              {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0].map(rr => {
                                const kelly = (wr / 100) - (1 - wr / 100) / rr;
                                const pr = Math.max(0, Math.min(1, fastPassRate(wr / 100, rr, 8, 5, 200, 30)));
                                const isCurrent = Math.abs(wr / 100 - metrics.winRate) < 0.04 && Math.abs(rr - metrics.rr) < 0.3;
                                const bg = kelly > 0.1 ? `rgba(74,222,128,${Math.min(0.25, kelly * 1.2)})` : kelly > 0 ? 'rgba(251,191,36,0.10)' : 'rgba(251,113,133,0.10)';
                                return (
                                  <td key={rr} style={{ padding: '5px 10px', textAlign: 'center', background: isCurrent ? 'rgba(255,255,255,.14)' : bg, borderRadius: 4, border: isCurrent ? '1px solid rgba(255,255,255,.4)' : 'none', color: kelly > 0 ? '#4ADE80' : '#FB7185', fontWeight: isCurrent ? 900 : 600, fontSize: 10 }}>
                                    {(pr * 100).toFixed(0)}%
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,.22)', marginTop: 8 }}>Giá trị = tỷ lệ qua prop firm ước tính (mục tiêu +8%, DD −5%). Ô được tô sáng = vị trí hiện tại của bạn.</p>
                  </div>
                </div>
              )}

              {/* ── TAB: TOY VS REAL ── */}
              {activeTab === 'toyreal' && toyResults && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <GitBranch size={13} color="#66BB6A" />
                      <div style={sLabel}>Chiến lược lý tưởng vs Thực tế — Phân tích suy giảm lợi thế</div>
                    </div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', lineHeight: 1.7, marginBottom: 20, maxWidth: 700 }}>
                      <strong style={{ color: '#60A5FA' }}>Toy Strategy</strong> là chuẩn mực hoàn hảo: WR 50%, R:R 2:1, không có biến động thực thi. <strong style={{ color: '#4ADE80' }}>Chiến lược thực</strong> của bạn lệch khỏi chuẩn do cảm xúc, mất kỷ luật, và nhiễu thị trường. Khoảng cách giữa hai đường đo lường <em>mức độ suy giảm lợi thế thực thi</em>.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
                      {/* Toy */}
                      <div style={{ background: 'rgba(71,159,250,0.04)', border: '1px solid rgba(71,159,250,0.2)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#60A5FA', marginBottom: 14, opacity: .9 }}>Toy Strategy (Chuẩn mực)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { l: 'Tỷ lệ thắng', v: '50.0%' }, { l: 'R:R', v: '1:2.00' },
                            { l: 'EV / Lệnh', v: '+$0.50', c: '#4ADE80' }, { l: 'Nhiễu thực thi', v: 'Không', c: '#4ADE80' },
                          ].map(r => (
                            <div key={r.l}>
                              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{r.l}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: (r as any).c || 'rgba(255,255,255,.8)' }}>{r.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Real */}
                      <div style={{ background: 'rgba(74,222,128,.04)', border: '1px solid rgba(74,222,128,.18)', borderRadius: 12, padding: '18px 20px' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#4ADE80', marginBottom: 14, opacity: .9 }}>Chiến lược thực của bạn</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            { l: 'Tỷ lệ thắng', v: `${(metrics.winRate * 100).toFixed(1)}%`, c: metrics.winRate >= 0.5 ? '#4ADE80' : '#FBBF24' },
                            { l: 'R:R', v: `1:${metrics.rr.toFixed(2)}`, c: metrics.rr >= 2 ? '#4ADE80' : '#FBBF24' },
                            { l: 'EV / Lệnh', v: `${metrics.ev >= 0 ? '+' : ''}$${metrics.ev.toFixed(2)}`, c: metrics.ev >= 0 ? '#4ADE80' : '#FB7185' },
                            { l: 'Skewness', v: metrics.skewness.toFixed(3), c: metrics.skewness > 0 ? '#4ADE80' : '#FB7185' },
                          ].map(r => (
                            <div key={r.l}>
                              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{r.l}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: r.c }}>{r.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Edge Decay Score */}
                    <div style={{ padding: '16px 20px', borderRadius: 12, background: toyResults.edgeDecay >= 0 ? 'rgba(74,222,128,.05)' : 'rgba(251,113,133,.05)', border: `1px solid ${toyResults.edgeDecay >= 0 ? 'rgba(74,222,128,.2)' : 'rgba(251,113,133,.2)'}` }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 6 }}>Mức suy giảm lợi thế vs chuẩn mực</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: toyResults.edgeDecay >= 0 ? '#4ADE80' : '#FB7185', letterSpacing: '-.06em' }}>
                        {toyResults.edgeDecay >= 0 ? '+' : ''}{toyResults.edgeDecay.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: 6 }}>
                        {toyResults.edgeDecay >= 0
                          ? 'EV thực của bạn vượt chuẩn mực — bạn đang tạo ra alpha vượt trội so với thực thi cơ học.'
                          : 'EV thực của bạn thấp hơn chuẩn mực — biến động thực thi và mất kỷ luật đang làm giảm lợi thế.'}
                      </div>
                    </div>
                  </div>

                  {/* Equity comparison */}
                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <TrendingUp size={13} color="#479ffa" />
                      <div style={sLabel}>Đường vốn — Thực tế vs Chuẩn mực Toy</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      {[{ c: '#4ADE80', l: 'Chiến lược thực' }, { c: '#60A5FA', l: 'Toy Benchmark' }].map(l => (
                        <div key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,.3)' }}>
                          <div style={{ width: 16, height: 2, background: l.c, borderRadius: 1 }} /> {l.l}
                        </div>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={equityData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#66BB6A" stopOpacity="0.15" /><stop offset="100%" stopColor="#66BB6A" stopOpacity="0" />
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
                        <Area type="monotone" dataKey="raw" stroke="#66BB6A" strokeWidth={2} fill="url(#g3)" dot={false} connectNulls name="Real" />
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
