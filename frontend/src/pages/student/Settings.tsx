import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';
import { Btn, Field, inputStyle } from '../../components/Modal';
import toast from 'react-hot-toast';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(20,21,23,0.42)',
  backdropFilter: 'blur(20px) saturate(125%)',
  WebkitBackdropFilter: 'blur(20px) saturate(125%)',
  border: '1px solid rgba(255,255,255,0.085)',
  borderRadius: 16,
  boxShadow: '0 10px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
};

export default function Settings() {
  const { user, updateUser, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingAcc, setDeletingAcc] = useState(false);

  const deleteRequested = user?.delete_requested_at;
  const daysLeft = deleteRequested
    ? 30 - (new Date().getTime() - parseISO(deleteRequested).getTime()) / (1000 * 60 * 60 * 24)
    : null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({ name, ...(password ? { password } : {}) });
      updateUser({ name });
      toast.success('Đã cập nhật thông tin');
      setPassword('');
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingProfile(false); }
  };

  const requestDelete = async () => {
    if (!confirm('Bạn chắc chắn muốn yêu cầu xóa tài khoản? Bạn có 30 ngày để hủy yêu cầu.')) return;
    setDeletingAcc(true);
    try {
      const res = await api.requestDelete();
      updateUser({ delete_requested_at: res.delete_requested_at });
      toast.success('Đã gửi yêu cầu xóa tài khoản');
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingAcc(false); }
  };

  const cancelDelete = async () => {
    setDeletingAcc(true);
    try {
      await api.cancelDelete();
      updateUser({ delete_requested_at: null });
      toast.success('Đã hủy yêu cầu xóa tài khoản');
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingAcc(false); }
  };

  return (
    <div style={{ maxWidth: 560, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(220,220,220,0.42)', textTransform: 'uppercase', marginBottom: 6 }}>ACCOUNT</div>
        <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em', color: '#f3f3f3' }}>Cài đặt tài khoản</h2>
      </div>

      {/* Profile */}
      <div style={{ ...GLASS_CARD, padding: '24px', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: '#f3f3f3' }}>Thông tin cá nhân</h3>
        <form onSubmit={saveProfile}>
          <Field label="Họ tên">
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Email">
            <input value={user?.email || ''} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </Field>
          <Field label="Mật khẩu mới (để trống nếu không đổi)">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </Field>
          <Btn type="submit" disabled={savingProfile}>{savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</Btn>
        </form>
      </div>

      {/* Account deletion */}
      <div style={{ ...GLASS_CARD, padding: '24px', border: `1px solid ${deleteRequested ? 'rgba(239,139,120,0.35)' : 'rgba(255,255,255,0.085)'}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#ef8b78' }}>Xóa tài khoản</h3>

        {deleteRequested ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239,139,120,0.08)', borderRadius: 8, marginBottom: 16 }}>
              <Clock size={18} color="#ef8b78" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#ef8b78' }}>Tài khoản sẽ bị xóa trong {Math.max(0, Math.ceil(daysLeft!)).toFixed(0)} ngày</div>
                <div style={{ fontSize: 12, color: 'rgba(210,210,210,0.5)', marginTop: 2 }}>Yêu cầu gửi vào {parseISO(deleteRequested).toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
            <Btn variant="ghost" onClick={cancelDelete} disabled={deletingAcc}>Hủy yêu cầu xóa</Btn>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'rgba(239,139,120,0.05)', borderRadius: 8, marginBottom: 16 }}>
              <AlertTriangle size={16} color="#FBBF24" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: 'rgba(210,210,210,0.5)', lineHeight: 1.6 }}>
                Sau khi gửi yêu cầu, tài khoản sẽ bị xóa vĩnh viễn sau <strong style={{ color: '#f3f3f3' }}>30 ngày</strong>. Bạn có thể hủy yêu cầu bất kỳ lúc nào trong thời gian đó.
              </p>
            </div>
            <Btn variant="danger" onClick={requestDelete} disabled={deletingAcc}>Yêu cầu xóa tài khoản</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
