/**
 * MindMap — Obsidian-style force-directed graph
 * Real user data · canvas physics · drag nodes · 3 themes
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useThemeStore, type MindTheme } from '../../store/themeStore';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

// ─── Theme definitions ────────────────────────────────────────────────────────
type ThemeKey = MindTheme;
const THEMES: Record<ThemeKey, {
  bg: string; bgRgb: [number,number,number];
  nodeLeaf: string; nodeBranch: string; nodeHub: string;
  link: string; linkAlpha: number;
  label: string;
  name: string;
}> = {
  void: {
    bg: '#050508', bgRgb: [5,5,8],
    nodeLeaf: '#8b8b9e', nodeBranch: '#8052ff', nodeHub: '#ffffff',
    link: '128,82,255', linkAlpha: 0.35,
    label: '#ededf3',
    name: 'Void',
  },
  mono: {
    bg: '#f5f5f5', bgRgb: [245,245,245],
    nodeLeaf: '#777', nodeBranch: '#111', nodeHub: '#000',
    link: '0,0,0', linkAlpha: 0.18,
    label: '#111',
    name: 'Mono',
  },
  ocean: {
    bg: '#050d1a', bgRgb: [5,13,26],
    nodeLeaf: '#3a6490', nodeBranch: '#3b9eff', nodeHub: '#ffffff',
    link: '59,158,255', linkAlpha: 0.3,
    label: '#e0eeff',
    name: 'Ocean',
  },
};

// ─── Graph types ──────────────────────────────────────────────────────────────
interface GNode {
  id: string;
  type: 'hub' | 'branch' | 'leaf';
  branchId: string;
  label: string;
  route?: string;
  x: number; y: number;
  vx: number; vy: number;
  fx?: number; fy?: number;
  r: number;
  mass: number;
}
interface GLink { source: string; target: string; }

const BRANCH_DEFS = [
  { id: 'dashboard',   label: 'Dashboard',   route: '/dashboard',          color: '#c0c0d0' },
  { id: 'journal',     label: 'Journal',      route: '/journal/idea',       color: '#8052ff' },
  { id: 'plans',       label: 'Trade Plans',  route: '/plans',              color: '#f5b142' },
  { id: 'psychology',  label: 'Psychology',   route: '/journal/psychology', color: '#15846e' },
  { id: 'reports',     label: 'Reports',      route: '/reports',            color: '#3b9eff' },
  { id: 'accounts',    label: 'Accounts',     route: '/accounts',           color: '#f08f5f' },
];

const STATIC_LEAVES: Record<string, string[]> = {
  dashboard:  ['Open P&L','Win rate','Drawdown','Best trade','Today P&L','Streak','Weekly target','Best streak'],
  psychology: ['Discipline','Patience','FOMO','Revenge trade','Focus day','Calm session','Overtrading','Fear of loss','FOMO entry'],
  reports:    ['Monthly P&L','Bias setup','Equity curve','Quality score','Functions','Bar chart','Profit factor'],
  accounts:   ['Balance','Leverage','Broker','FTMO 5%','Soft breach','Swap','Lot size','Account #'],
};

function buildGraph(journals: any[], plans: any[], cw: number, ch: number) {
  const cx = cw / 2, cy = ch / 2;
  const nodes: GNode[] = [];
  const links: GLink[] = [];

  nodes.push({ id: 'hub', type: 'hub', branchId: 'hub', label: 'IR', x: cx, y: cy, vx: 0, vy: 0, r: 18, mass: 8 });

  const count = BRANCH_DEFS.length;
  BRANCH_DEFS.forEach((b, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const dist = Math.min(cw, ch) * 0.28;
    const bx = cx + Math.cos(angle) * dist;
    const by = cy + Math.sin(angle) * dist;
    nodes.push({ id: b.id, type: 'branch', branchId: b.id, label: b.label, route: b.route, x: bx, y: by, vx: 0, vy: 0, r: 9, mass: 2.5 });
    links.push({ source: 'hub', target: b.id });

    const addLeaves = (labels: string[], getId: (i: number) => string) => {
      labels.forEach((label, li) => {
        const id = getId(li);
        const a = angle + (li - labels.length / 2) * 0.32;
        const d = dist * (0.44 + (li % 3) * 0.18);
        nodes.push({ id, type: 'leaf', branchId: b.id, label, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: 0, vy: 0, r: 3.5, mass: 1 });
        links.push({ source: b.id, target: id });
      });
    };

    if (b.id === 'journal' && journals.length) {
      const labels = journals.slice(0, 16).map((j: any) => j.symbol || j.notes?.slice(0,12) || 'Trade');
      addLeaves(labels, (i) => `j-${i}`);
    } else if (b.id === 'plans' && plans.length) {
      const labels = plans.slice(0, 12).map((p: any) => p.title?.slice(0,14) || 'Plan');
      addLeaves(labels, (i) => `p-${i}`);
    } else if (STATIC_LEAVES[b.id]) {
      addLeaves(STATIC_LEAVES[b.id], (i) => `${b.id}-${i}`);
    }
  });

  return { nodes, links };
}

// ─── Physics ──────────────────────────────────────────────────────────────────
const K_REPEL = 2400;
const K_SPRING = 0.022;
const REST_HUB_BR = 190;
const REST_BR_LEAF = 85;
const DAMPING = 0.83;
const HUB_ANCHOR = 0.06;

function tick(nodes: GNode[], links: GLink[], cx: number, cy: number) {
  const map = new Map(nodes.map(n => [n.id, n]));

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy + 1;
      const d = Math.sqrt(d2);
      const f = K_REPEL / d2;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx -= fx / a.mass; a.vy -= fy / a.mass;
      b.vx += fx / b.mass; b.vy += fy / b.mass;
    }
  }

  for (const lk of links) {
    const a = map.get(lk.source), b = map.get(lk.target);
    if (!a || !b) continue;
    const rest = a.type === 'hub' ? REST_HUB_BR : REST_BR_LEAF;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
    const f = K_SPRING * (d - rest);
    const fx = (dx / d) * f, fy = (dy / d) * f;
    a.vx += fx / a.mass; a.vy += fy / a.mass;
    b.vx -= fx / b.mass; b.vy -= fy / b.mass;
  }

  const dpr = window.devicePixelRatio || 1;
  const minX = 40 * dpr;
  const maxX = (cx * 2) - 40 * dpr;
  const minY = 100 * dpr; // Giữ khoảng cách an toàn với navbar phía trên
  const maxY = (cy * 2) - 40 * dpr;

  for (const n of nodes) {
    if (n.fx !== undefined && n.fy !== undefined) {
      n.x = n.fx; n.y = n.fy; n.vx = 0; n.vy = 0;
      if (n.x < minX) n.x = minX;
      if (n.x > maxX) n.x = maxX;
      if (n.y < minY) n.y = minY;
      if (n.y > maxY) n.y = maxY;
      continue;
    }
    n.vx *= DAMPING; n.vy *= DAMPING;
    n.x += n.vx; n.y += n.vy;

    if (n.x < minX) { n.x = minX; n.vx *= -0.5; }
    if (n.x > maxX) { n.x = maxX; n.vx *= -0.5; }
    if (n.y < minY) { n.y = minY; n.vy *= -0.5; }
    if (n.y > maxY) { n.y = maxY; n.vy *= -0.5; }
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function draw(
  ctx: CanvasRenderingContext2D,
  nodes: GNode[], links: GLink[],
  theme: typeof THEMES[ThemeKey],
  hoverId: string | null,
  pan: { x: number; y: number },
  zoom: number,
  branchColors: Record<string, string>,
) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);

  const map = new Map(nodes.map(n => [n.id, n]));

  // Links
  for (const lk of links) {
    const a = map.get(lk.source), b = map.get(lk.target);
    if (!a || !b) continue;
    const hov = hoverId === a.id || hoverId === b.id;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(${theme.link},${hov ? 0.7 : theme.linkAlpha})`;
    ctx.lineWidth = (hov ? 1.3 : 0.6) / zoom;
    ctx.stroke();
  }

  // Nodes
  for (const n of nodes) {
    const hov = n.id === hoverId;
    let color = theme.nodeLeaf;
    if (n.type === 'hub') color = theme.nodeHub;
    else if (n.type === 'branch') color = branchColors[n.id] || theme.nodeBranch;

    const r = hov ? n.r * 1.7 : n.r;

    if (n.type === 'hub') {
      // Glow aura
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.8);
      grad.addColorStop(0, `rgba(${theme.link},0.18)`);
      grad.addColorStop(1, `rgba(${theme.link},0)`);
      ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      // Outer dashed ring
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.lineDashOffset = -(Date.now() * 0.02 % 9);
      ctx.beginPath(); ctx.arc(n.x, n.y, r + 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${theme.link},0.4)`; ctx.lineWidth = 0.8 / zoom; ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      // Solid ring
      ctx.beginPath(); ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${theme.link},0.6)`; ctx.lineWidth = 1.2 / zoom; ctx.stroke();
      // Fill
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    } else if (n.type === 'branch') {
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      // label below
      ctx.font = `${hov ? 600 : 500} ${11 / zoom}px Inter,system-ui,sans-serif`;
      ctx.fillStyle = hov ? theme.label : (theme.label + 'cc');
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + r + 13 / zoom);
    } else {
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hov ? color : (color + '99');
      ctx.fill();
    }
  }

  // Hub labels — contrasting color so visible on all themes
  const hub = map.get('hub');
  if (hub) {
    const hubLabelColor = theme.bg === '#f5f5f5' ? '#111' : '#fff';
    ctx.font = `800 ${11 / zoom}px Inter,system-ui,sans-serif`;
    ctx.fillStyle = hubLabelColor;
    ctx.textAlign = 'center';
    ctx.fillText('IR', hub.x, hub.y + 2 / zoom);
    ctx.font = `400 ${7.5 / zoom}px Inter,system-ui,sans-serif`;
    ctx.fillStyle = `rgba(${theme.link},0.8)`;
    ctx.fillText('WE PLAY', hub.x, hub.y + 13 / zoom);
  }

  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MindMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const animRef = useRef<number>(0);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const targetZoomRef = useRef(1);
  const targetPanRef = useRef({ x: 0, y: 0 });
  const dragNodeRef = useRef<{ id: string; offX: number; offY: number } | null>(null);
  const panDragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const hoverRef = useRef<string | null>(null);
  const builtRef = useRef(false);
  const navigate = useNavigate();

  const { mindTheme: theme, setMindTheme: setTheme } = useThemeStore();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);

  const { data: journalData } = useQuery({ queryKey: ['journals-mm'], queryFn: () => api.getJournals({ type: 'idea', limit: '18' }) });
  const { data: planData }    = useQuery({ queryKey: ['plans-mm'],    queryFn: () => api.getPlans({ limit: '14' }) });

  const branchColors = Object.fromEntries(BRANCH_DEFS.map(b => [b.id, b.color]));

  // Build graph once data arrives
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || builtRef.current) return;
    if (journalData === undefined && planData === undefined) return;
    builtRef.current = true;
    const journals: any[] = (journalData as any)?.entries ?? (Array.isArray(journalData) ? journalData : []);
    const plans: any[] = (planData as any)?.plans ?? (Array.isArray(planData) ? planData : []);
    const { nodes, links } = buildGraph(journals, plans, canvas.width, canvas.height);
    nodesRef.current = nodes;
    linksRef.current = links;
  }, [journalData, planData]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      panRef.current = { x: 0, y: 0 };
      targetPanRef.current = { x: 0, y: 0 };
      builtRef.current = false;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Animation loop with smooth zoom lerp
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Lerp zoom and pan toward targets
        const lf = 0.14;
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * lf;
        panRef.current.x += (targetPanRef.current.x - panRef.current.x) * lf;
        panRef.current.y += (targetPanRef.current.y - panRef.current.y) * lf;

        if (nodesRef.current.length) {
          const cx = canvas.width / (2 * zoomRef.current);
          const cy = canvas.height / (2 * zoomRef.current);
          tick(nodesRef.current, linksRef.current, cx, cy);
          draw(ctx, nodesRef.current, linksRef.current, THEMES[theme], hoverRef.current, panRef.current, zoomRef.current, branchColors);
        }
      }
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { alive = false; cancelAnimationFrame(animRef.current); };
  }, [theme]);

  // ── Input helpers ──
  const getWorldCoords = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const rawX = (e.clientX - rect.left) * dpr;
    const rawY = (e.clientY - rect.top) * dpr;
    return { wx: (rawX - panRef.current.x) / zoomRef.current, wy: (rawY - panRef.current.y) / zoomRef.current };
  };

  const hitTest = useCallback((clientX: number, clientY: number): GNode | null => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const wx = ((clientX - rect.left) * dpr - panRef.current.x) / zoomRef.current;
    const wy = ((clientY - rect.top)  * dpr - panRef.current.y) / zoomRef.current;
    let best: GNode | null = null, bestD = Infinity;
    for (const n of nodesRef.current) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      const thr = Math.max(n.r + 6, 14);
      if (d < thr && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragNodeRef.current) {
      const { wx, wy } = getWorldCoords(e);
      const n = nodesRef.current.find(x => x.id === dragNodeRef.current!.id);
      if (n) { n.fx = wx - dragNodeRef.current.offX; n.fy = wy - dragNodeRef.current.offY; }
      return;
    }
    const hit = hitTest(e.clientX, e.clientY);
    const id = hit?.id ?? null;
    if (id !== hoverRef.current) { hoverRef.current = id; setHoverId(id); }
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'grab';
  }, [hitTest]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    const { wx, wy } = getWorldCoords(e);
    if (hit) {
      dragNodeRef.current = { id: hit.id, offX: wx - hit.x, offY: wy - hit.y };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    } else {
      const hub = nodesRef.current.find(n => n.id === 'hub');
      if (hub) {
        hub.fx = wx;
        hub.fy = wy;
        dragNodeRef.current = { id: 'hub', offX: 0, offY: 0 };
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      }
    }
  }, [hitTest]);

  const onMouseUp = useCallback(() => {
    if (dragNodeRef.current) {
      const n = nodesRef.current.find(x => x.id === dragNodeRef.current!.id);
      if (n) { delete n.fx; delete n.fy; }
      dragNodeRef.current = null;
    }
    panDragRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit?.route) navigate(hit.route);
  }, [hitTest, navigate]);

  // Non-passive wheel listener for smooth zoom toward cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio;
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;
      const oldZ = targetZoomRef.current;
      const newZ = Math.max(0.12, Math.min(10, oldZ * (e.deltaY < 0 ? 1.1 : 0.91)));
      targetPanRef.current = {
        x: mx - (mx - panRef.current.x) * (newZ / oldZ),
        y: my - (my - panRef.current.y) * (newZ / oldZ),
      };
      targetZoomRef.current = newZ;
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  const onWheel = useCallback((_e: React.WheelEvent) => { /* handled by native listener */ }, []);

  // Global mouse listeners — fix drag "sticking" when mouse leaves canvas fast
  useEffect(() => {
    const onGlobalMove = (e: MouseEvent) => {
      if (dragNodeRef.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        const sx = (e.clientX - rect.left) * dpr;
        const sy = (e.clientY - rect.top)  * dpr;
        const wx = (sx - panRef.current.x) / zoomRef.current;
        const wy = (sy - panRef.current.y) / zoomRef.current;
        const n = nodesRef.current.find(x => x.id === dragNodeRef.current!.id);
        if (n) { n.fx = wx - dragNodeRef.current.offX; n.fy = wy - dragNodeRef.current.offY; }
      }
    };
    const onGlobalUp = () => {
      if (dragNodeRef.current) {
        const n = nodesRef.current.find(x => x.id === dragNodeRef.current!.id);
        if (n) { delete n.fx; delete n.fy; }
        dragNodeRef.current = null;
      }
      panDragRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    };
    window.addEventListener('mousemove', onGlobalMove);
    window.addEventListener('mouseup', onGlobalUp);
    return () => {
      window.removeEventListener('mousemove', onGlobalMove);
      window.removeEventListener('mouseup', onGlobalUp);
    };
  }, []);

  const T = THEMES[theme];

  // Tooltip position for hovered leaf
  const leafTooltip = (() => {
    if (!hoverId) return null;
    const n = nodesRef.current.find(x => x.id === hoverId);
    if (!n || n.type !== 'leaf') return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const sx = (n.x * zoomRef.current + panRef.current.x) / dpr + rect.left;
    const sy = (n.y * zoomRef.current + panRef.current.y) / dpr + rect.top - 10;
    return { label: n.label, sx, sy };
  })();

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, userSelect: 'none' }}>
      {/* Collapsible theme + reset — bottom-right corner */}
      <div style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {themeOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', animation: 'fadeUp 0.2s ease' }}>
            {(Object.keys(THEMES) as ThemeKey[]).map(k => (
              <button key={k} onClick={() => { setTheme(k); builtRef.current = false; setThemeOpen(false); }} style={{
                padding: '5px 14px', borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                background: k === theme ? (k === 'mono' ? '#ffffff' : T.nodeHub) : 'rgba(20,20,28,0.85)',
                color: k === theme ? (k === 'mono' ? '#000000' : T.bg) : '#ededf3',
                border: `1px solid ${k === theme ? (k === 'mono' ? '#000000' : T.nodeHub) : 'rgba(255,255,255,0.12)'}`,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.15s',
              }}>
                {THEMES[k].name}
              </button>
            ))}
            <button onClick={() => {
              targetZoomRef.current = 1; targetPanRef.current = { x: 0, y: 0 };
              const canvas = canvasRef.current;
              if (canvas) {
                const hub = nodesRef.current.find(n => n.id === 'hub');
                if (hub) {
                  hub.x = canvas.width / 2;
                  hub.y = canvas.height / 2;
                  hub.vx = 0;
                  hub.vy = 0;
                }
              }
            }} style={{
              padding: '5px 14px', borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(20,20,28,0.85)', color: '#ededf3',
              border: '1px solid rgba(255,255,255,0.12)', letterSpacing: '0.08em', textTransform: 'uppercase',
              backdropFilter: 'blur(12px)',
            }}>
              Reset View
            </button>
          </div>
        )}
        <button onClick={() => setThemeOpen(p => !p)} style={{
          width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(20,20,28,0.85)', border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(12px)', color: '#ededf3', fontSize: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'transform 0.2s',
          transform: themeOpen ? 'rotate(45deg)' : 'none',
        }}>
          ✦
        </button>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={onClick}
        onWheel={onWheel}
      />

      {/* Leaf label tooltip */}
      {leafTooltip && (
        <div style={{
          position: 'fixed', left: leafTooltip.sx, top: leafTooltip.sy,
          transform: 'translateX(-50%) translateY(-100%)',
          pointerEvents: 'none', zIndex: 20,
          background: 'rgba(8,8,12,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '3px 9px',
          fontSize: 11, color: '#e0e0f0', whiteSpace: 'nowrap',
        }}>
          {leafTooltip.label}
        </div>
      )}
    </div>
  );
}
