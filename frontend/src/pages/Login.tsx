/**
 * Login — Fey obsidian terminal
 * #0b0b0b void · floating glass cards · neon glow accents
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

const C = {
  bg:     '#0b0b0b',
  rail:   'rgba(255,255,255,0.08)',
  fog:    '#868f97',
  frost:  '#e6e6e6',
  white:  '#ffffff',
  blue:   '#479ffa',
  green:  '#4ebe96',
  red:    '#c8746a',
  orange: '#ffa16c',
};

// ── IR logo badge ──
function IRBadge() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#111827 0%,#0d1520 100%)', border: '1px solid rgba(255,255,255,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: "'Montserrat','Inter Tight',sans-serif", fontWeight: 800, fontSize: 11, color: '#e8f4ff', letterSpacing: '-0.07em', lineHeight: 1 }}>IR</span>
    </div>
  );
}

// ── Nav ──
function NavBar({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px',
      background: 'rgba(11,11,11,0.9)', backdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${C.rail}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IRBadge />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <button onClick={onSignIn} style={{ fontSize: 13, color: C.fog, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, transition: 'color 0.15s', fontFamily: 'inherit' }}
          onMouseEnter={e => (e.currentTarget.style.color = C.white)}
          onMouseLeave={e => (e.currentTarget.style.color = C.fog)}>Log in</button>
        <button onClick={onGetStarted} style={{ fontSize: 13, fontWeight: 600, color: C.white, background: 'transparent', border: `1px solid ${C.frost}`, borderRadius: 99, padding: '6px 18px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
          Get started
        </button>
      </div>
    </nav>
  );
}

// ── Fey dark terminal hero visual ──
function HeroVisual() {
  // Sparkline points (normalized 0-1 for positive trend)
  const sparkPos = [0.62, 0.58, 0.64, 0.55, 0.50, 0.44, 0.48, 0.38, 0.32, 0.28, 0.22, 0.18];

  function sparkPath(pts: number[], w: number, h: number) {
    return pts.map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * w} ${y * h}`).join(' ');
  }

  const trades = [
    { sym: 'XAUUSD', dir: 'LONG',  pnl: +1850.00, pos: true  },
    { sym: 'NQ1!',   dir: 'LONG',  pnl: +5940.00, pos: true  },
    { sym: 'EURUSD', dir: 'SHORT', pnl:  -320.50, pos: false },
    { sym: 'BTCUSD', dir: 'LONG',  pnl: +2100.00, pos: true  },
  ];

  const kpis = [
    { label: 'Win Rate',     value: '71.4%',   color: C.green  },
    { label: 'Profit Factor',value: '2.8×',    color: C.blue   },
    { label: 'Net P&L',      value: '+$9,569', color: C.green  },
    { label: 'Avg R:R',      value: '1:2.4',   color: C.orange },
  ];

  const glassCard: React.CSSProperties = {
    background: 'rgba(19,19,19,0.72)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: '16px 18px',
    boxShadow: '0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.6)',
  };

  return (
    <div style={{ position: 'relative', width: 400, flexShrink: 0 }}>
      {/* Atmospheric glow orbs */}
      <div style={{ position: 'absolute', top: -40, right: -20, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,159,250,0.13) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orbPulse 5s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: -20, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,190,150,0.1) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orbPulse 6.5s ease-in-out infinite 1s' }} />

      {/* Card 1 — KPI grid */}
      <div className="float-card" style={{ ...glassCard, marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.fog, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Performance · Last 30 Days</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          {kpis.map(k => (
            <div key={k.label}>
              <div style={{ fontSize: 9, color: C.fog, marginBottom: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color, letterSpacing: '-0.05em', textShadow: `0 0 16px ${k.color}66` }}>{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 2 — Equity curve */}
      <div className="float-card-2" style={{ ...glassCard, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.fog, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Cumulative P&L</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.green, letterSpacing: '-0.04em', textShadow: `0 0 12px ${C.green}55` }}>+$9,569.00</div>
        </div>
        <svg viewBox="0 0 360 56" width="100%" height={56} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ebe96" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4ebe96" stopOpacity="0" />
            </linearGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <path d={`${sparkPath(sparkPos, 360, 52)} L 360 56 L 0 56 Z`} fill="url(#heroGrad)" />
          <path d={sparkPath(sparkPos, 360, 52)} stroke="#4ebe96" strokeWidth="1.8" fill="none" strokeLinecap="round" filter="url(#glow)" />
          <circle cx={360} cy={sparkPos[sparkPos.length - 1] * 52} r="3.5" fill="#4ebe96" filter="url(#glow)" />
        </svg>
      </div>

      {/* Card 3 — Trade list */}
      <div className="float-card-3" style={{ ...glassCard }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.fog, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Recent Trades</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trades.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: t.pos ? 'rgba(78,190,150,0.1)' : 'rgba(200,116,106,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {t.pos ? <TrendingUp size={12} color={C.green} /> : <TrendingDown size={12} color={C.red} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#cccccc', letterSpacing: '-0.01em' }}>{t.sym}</div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, border: `1px solid ${t.pos ? 'rgba(78,190,150,0.4)' : 'rgba(200,116,106,0.4)'}`, color: t.pos ? C.green : C.red }}>{t.dir}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: t.pos ? C.green : C.red, letterSpacing: '-0.03em', textShadow: `0 0 10px ${t.pos ? C.green : C.red}44` }}>
                {t.pos ? '+' : ''}${Math.abs(t.pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating accent line */}
      <div style={{ position: 'absolute', top: -1, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${C.blue}60, transparent)` }} />
    </div>
  );
}

// ── Auth form ──
function AuthForm({ mode, onSwitch }: { mode: 'login' | 'register'; onSwitch: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const res = mode === 'login'
        ? await api.login(form.email, form.password)
        : await api.register(form.name, form.email, form.password);
      setAuth(res.token, res.user);
      navigate(res.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ width: 340, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px', background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(24px)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
      {/* Top accent glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.blue}80, transparent)` }} />

      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.white, letterSpacing: '-0.04em', marginBottom: 5 }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ fontSize: 13, color: C.fog, letterSpacing: '-0.01em' }}>{mode === 'login' ? 'Sign in to your terminal.' : 'Start tracking trades today.'}</p>
      </div>

      <form onSubmit={submit}>
        {mode === 'register' && (
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Full name</label>
            <input value={form.name} onChange={f('name')} placeholder="Nguyen Van A" style={inp}
              onFocus={e => (e.target.style.borderColor = C.blue)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Email</label>
          <input type="email" value={form.email} onChange={f('email')} placeholder="you@example.com" required style={inp}
            onFocus={e => (e.target.style.borderColor = C.blue)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Password</label>
          <input type="password" value={form.password} onChange={f('password')} placeholder="••••••••" required style={inp}
            onFocus={e => (e.target.style.borderColor = C.blue)} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 20px', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 600, background: loading ? 'transparent' : `rgba(71,159,250,0.1)`,
          color: loading ? C.fog : C.white, border: `1px solid ${loading ? 'rgba(255,255,255,0.1)' : C.blue}`,
          transition: 'all 0.2s', fontFamily: 'inherit',
          boxShadow: loading ? 'none' : `0 0 20px rgba(71,159,250,0.12)`,
        }}
          onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = `rgba(71,159,250,0.18)`; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 28px rgba(71,159,250,0.22)`; } }}
          onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = `rgba(71,159,250,0.1)`; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px rgba(71,159,250,0.12)`; } }}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          {!loading && <ArrowRight size={13} />}
        </button>
      </form>

      <p style={{ marginTop: 18, fontSize: 13, color: C.fog, textAlign: 'center' }}>
        {mode === 'login' ? 'No account? ' : 'Have an account? '}
        <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: C.frost, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
          {mode === 'login' ? 'Sign up' : 'Sign in'}
        </button>
      </p>

    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const slide = (delay = 0): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'none' : 'translateY(18px)',
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Montserrat', 'Inter Tight', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      {/* Full-page atmospheric glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,159,250,0.055) 0%, transparent 65%)', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,190,150,0.04) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 800, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.02), transparent)', transform: 'translate(-50%,-50%)' }} />
      </div>

      <NavBar onSignIn={() => setMode('login')} onGetStarted={() => setMode('register')} />

      <div style={{ paddingTop: 56, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 48px 60px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, width: '100%', display: 'flex', alignItems: 'center', gap: 56, justifyContent: 'space-between', flexWrap: 'wrap' }}>

          {/* Left — hero copy */}
          <div style={{ flex: '0 0 auto', maxWidth: 400 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '5px 14px', marginBottom: 32, ...slide(0.0) }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
              <span style={{ fontSize: 12, color: C.fog, letterSpacing: '0.02em' }}>Prop firm multi-account tracking</span>
            </div>

            <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.05em', color: C.white, marginBottom: 20, fontFamily: "'Montserrat', sans-serif", ...slide(0.07) }}>
              IN RANGE<br />
              WE PLAY<br />
              <span style={{ fontStyle: 'italic', color: C.blue, textShadow: `0 0 40px rgba(71,159,250,0.4)`, fontSize: 40, letterSpacing: '-0.03em' }}>× Rels</span>
            </h1>

            <p style={{ fontSize: 15, color: C.fog, lineHeight: 1.65, marginBottom: 36, maxWidth: 340, letterSpacing: '-0.01em', ...slide(0.14) }}>
              Track plans, review psychology, build consistency. See clearly. Trade better. Grow every day.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, ...slide(0.2) }}>
              <button onClick={() => setMode('register')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(71,159,250,0.1)', color: C.white, border: `1px solid ${C.blue}`, borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', boxShadow: '0 0 20px rgba(71,159,250,0.1)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(71,159,250,0.2)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(71,159,250,0.1)`; }}>
                Get started <ArrowRight size={14} />
              </button>
              <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.fog, transition: 'color 0.15s', padding: 0, fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.white)}
                onMouseLeave={e => (e.currentTarget.style.color = C.fog)}>
                Sign in →
              </button>
            </div>
          </div>

          {/* Auth form */}
          <div style={slide(0.1)}>
            <AuthForm mode={mode} onSwitch={() => setMode(mode === 'login' ? 'register' : 'login')} />
          </div>

          {/* Product cards */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0, ...slide(0.18) }}>
            <HeroVisual />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 48px', display: 'flex', justifyContent: 'center', gap: 32, position: 'relative', zIndex: 1 }}>
        {['Privacy', 'Terms', 'Security'].map(l => (
          <a key={l} href="#" style={{ fontSize: 12, color: C.fog, textDecoration: 'none' }}>{l}</a>
        ))}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#555a60', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' };
const inp: React.CSSProperties = { width: '100%', padding: '9px 13px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#e6e6e6', fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' };
