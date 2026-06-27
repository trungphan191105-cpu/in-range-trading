import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export default function Modal({ title, onClose, children, width = 560 }: Props) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,8,16,0.8)', padding: 16, backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border-light)',
        borderRadius: 18,
        width, maxWidth: '100%', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(56,189,248,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1px solid var(--border)',
  background: 'var(--surface2)', color: 'var(--text)',
  fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
  outline: 'none', transition: 'border-color 0.15s',
};

export const selectStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1px solid var(--border)',
  background: 'var(--surface2)', color: 'var(--text)',
  fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
  outline: 'none', cursor: 'pointer',
};

export function Btn({
  children, onClick, variant = 'primary', disabled, type = 'button', style,
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'accent';
  disabled?: boolean; type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700,
    fontFamily: 'inherit', letterSpacing: '-0.01em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', border: 'none',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--btn)', color: 'white', boxShadow: '0 4px 16px rgba(79,99,216,0.35)' },
    accent:  { background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', color: '#040810', fontWeight: 800, boxShadow: '0 4px 20px rgba(56,189,248,0.3)' },
    ghost:   { background: 'var(--surface3)', color: 'var(--text-soft)', border: '1px solid var(--border)' },
    danger:  { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(240,80,110,0.2)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}
