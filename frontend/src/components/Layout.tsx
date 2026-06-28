/**
 * App shell — Dock-style icon nav
 * Centered pill · prismatic active ring · emotion icon for psychology
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import {
  Home, BookOpen, Brain, BarChart2,
  Settings, Users, LogOut, TrendingUp, Shield, Wallet, ChevronDown,
  DollarSign, Activity
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// ── Custom emotion face icon (Psychology / Tâm lý) ──
function EmotionIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Soft blob circle */}
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Eyes */}
      <circle cx="9" cy="10.5" r="1.2" fill={color} />
      <circle cx="15" cy="10.5" r="1.2" fill={color} />
      {/* Slight smile */}
      <path d="M9 14.5 Q12 17 15 14.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

const studentNav = [
  { to: '/dashboard',          icon: Home,         label: 'Home',     custom: false },
  { to: '/stats',              icon: BarChart2,    label: 'Stats',    custom: false },
  { to: '/accounts',           icon: Wallet,       label: 'Accounts', custom: false },
  { to: '/plans',              icon: BookOpen,     label: 'Plans',    custom: false },
  { to: '/journal/idea',       icon: TrendingUp,   label: 'Journal',  custom: false },
  { to: '/journal/psychology', icon: Brain,        label: 'Tâm lý',  custom: true  },
  { to: '/reports',            icon: BarChart2,    label: 'Reports',  custom: false },
  { to: '/spend',              icon: DollarSign,   label: 'Spend',    custom: false },
  { to: '/quant',              icon: Activity,     label: 'Quant',    custom: false },
];

const adminNav = [
  { to: '/admin',          icon: Home,  label: 'Overview', custom: false },
  { to: '/admin/students', icon: Users, label: 'Students', custom: false },
];

// ── Dropdown menu item ──────────────────────────────────────────────────────
function MenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 11px', background: hov ? 'rgba(255,255,255,0.05)' : 'none',
        border: 'none', cursor: 'pointer',
        color: danger ? '#c8746a' : '#cccccc',
        fontSize: 12, fontWeight: 400, borderRadius: 8,
        transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
        letterSpacing: '0.01em',
      }}>
      {icon} {label}
    </button>
  );
}

// ── White/blue active ring ──
function NavIcon({ isActive, icon: Icon, isCustom }: { isActive: boolean; icon: React.ElementType; isCustom: boolean }) {
  const iconEl = isCustom
    ? <EmotionIcon size={15} color={isActive ? '#fff' : 'rgba(255,255,255,0.42)'} />
    : <Icon size={15} strokeWidth={1.6} color={isActive ? '#fff' : 'rgba(255,255,255,0.42)'} />;

  if (!isActive) {
    return (
      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {iconEl}
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <div className="prism-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg,#ffffff,#479ffa,#a0c8ff,#e8f4ff,#ffffff)', filter: 'blur(0.5px)' }} />
      <div style={{ position: 'absolute', inset: 2.5, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#1e2a3a,#0d1520)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}>
        {iconEl}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const nav = user?.role === 'admin' ? adminNav : studentNav;
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  // Refs so mousemove closure always sees current values without re-binding
  const menuOpenRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { menuOpenRef.current = userMenuOpen; }, [userMenuOpen]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Never hide while a dropdown is open — cursor must be able to reach it
      if (menuOpenRef.current) { setNavVisible(true); return; }
      if (e.clientY < 80) {
        // Cursor in trigger zone — show immediately, cancel any pending hide
        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
        setNavVisible(true);
      } else {
        // Cursor left trigger zone — wait 300ms before hiding (prevents flicker)
        if (!hideTimerRef.current) {
          hideTimerRef.current = setTimeout(() => {
            hideTimerRef.current = null;
            if (!menuOpenRef.current) setNavVisible(false);
          }, 300);
        }
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Global animated ambient orbs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '5%', left: '12%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,214,164,0.055) 0%, transparent 65%)', animation: 'orbDrift 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '8%', right: '10%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(78,170,250,0.04) 0%, transparent 65%)', animation: 'orbDrift 25s ease-in-out infinite reverse 5s' }} />
        <div style={{ position: 'absolute', top: '50%', left: '58%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,100,255,0.03) 0%, transparent 65%)', animation: 'orbDrift 30s ease-in-out infinite 10s' }} />
        <div style={{ position: 'absolute', top: '30%', right: '30%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,214,164,0.03) 0%, transparent 65%)', animation: 'orbDrift 18s ease-in-out infinite reverse 2s' }} />
      </div>

      {/* ── Floating centered dock ── */}
      <div style={{ position: 'fixed', top: 14, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none', padding: '0 16px', opacity: navVisible ? 1 : 0, transform: navVisible ? 'translateY(0)' : 'translateY(-12px)', transition: 'opacity 0.22s ease, transform 0.22s ease' }}>
        <header style={{
          height: 46,
          background: 'rgba(11,11,11,0.88)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 9999,
          display: 'flex', alignItems: 'center',
          padding: '0 6px 0 10px',
          boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 48px rgba(0,0,0,0.75)',
          pointerEvents: 'all',
          gap: 0,
          width: 'fit-content',
          maxWidth: '96vw',
        }}>

          {/* Brand — IR wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: 10, borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#111827 0%,#0d1520 100%)', border: '1px solid rgba(255,255,255,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Montserrat','Inter Tight',sans-serif", fontWeight: 900, fontSize: 11, color: '#e8f4ff', letterSpacing: '-0.08em', lineHeight: 1 }}>IR</span>
            </div>
          </div>

          {/* Nav icons */}
          <nav style={{ display: 'flex', alignItems: 'center', paddingLeft: 4, paddingRight: 2 }}>
            {user?.role === 'admin' && (
              <span style={{ fontSize: 8, color: 'rgba(82,102,235,0.7)', display: 'flex', alignItems: 'center', gap: 2, marginRight: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                <Shield size={7} /> ADM
              </span>
            )}
            {nav.map(({ to, icon: Icon, label, custom }) => (
              <NavLink key={to} to={to} end={to === '/admin' || to === '/dashboard'}
                className="nav-item"
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', borderRadius: '50%' }}>
                {({ isActive }) => (
                  <>
                    <NavIcon isActive={isActive} icon={Icon} isCustom={custom} />
                    <span className="nav-tooltip">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', marginRight: 8, flexShrink: 0 }} />

          {/* User badge — wrapper div owns all hover state to eliminate dead-zones */}
          <div
            style={{ position: 'relative', flexShrink: 0 }}
            onMouseEnter={() => setUserMenuOpen(true)}
            onMouseLeave={() => {
              // 300ms grace period — cursor can travel to the dropdown without it vanishing
              hideTimerRef.current = setTimeout(() => { if (!menuOpenRef.current) setUserMenuOpen(false); }, 300);
            }}
          >
            <button
              onClick={() => setUserMenuOpen(p => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 40, padding: '4px 10px 4px 5px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#479ffa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#cccccc', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name?.split(' ').pop()}
              </span>
              <ChevronDown size={10} color="#868f97" style={{ transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)', transform: userMenuOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {/* Invisible bridge — fills any pixel gap between button and dropdown */}
            {userMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, height: 10, width: '100%', minWidth: 200 }} />
            )}

            {userMenuOpen && (
              <div
                onMouseEnter={() => { if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; } setUserMenuOpen(true); }}
                style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, minWidth: 210, background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 5, zIndex: 50, boxShadow: '0 24px 64px rgba(0,0,0,0.8)', animation: 'scaleIn 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
                <div style={{ padding: '10px 14px 11px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, color: '#e6e6e6', marginBottom: 2, fontSize: 12, letterSpacing: '-0.01em' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: '#868f97', letterSpacing: '0.02em' }}>{user?.email}</div>
                </div>
                <MenuBtn icon={<Settings size={12} />} label="Settings" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }} />
                <MenuBtn icon={<LogOut size={12} />} label="Sign out" onClick={() => { logout(); navigate('/login'); setUserMenuOpen(false); }} danger />
              </div>
            )}
          </div>
        </header>
      </div>

      <main style={{ marginTop: 82, flex: 1, padding: '24px 28px', minWidth: 0, position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
