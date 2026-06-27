import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';
import { Btn, Field, inputStyle } from '../../components/Modal';
import toast from 'react-hot-toast';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';

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
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Cài đặt tài khoản</h2>

      {/* Profile */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Thông tin cá nhân</h3>
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
      <div style={{ background: 'var(--surface)', border: `1px solid ${deleteRequested ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`, borderRadius: 12, padding: '24px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--red)' }}>Xóa tài khoản</h3>

        {deleteRequested ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, marginBottom: 16 }}>
              <Clock size={18} color="var(--red)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Tài khoản sẽ bị xóa trong {Math.max(0, Math.ceil(daysLeft!)).toFixed(0)} ngày</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Yêu cầu gửi vào {parseISO(deleteRequested).toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
            <Btn variant="ghost" onClick={cancelDelete} disabled={deletingAcc}>Hủy yêu cầu xóa</Btn>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, marginBottom: 16 }}>
              <AlertTriangle size={16} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Sau khi gửi yêu cầu, tài khoản sẽ bị xóa vĩnh viễn sau <strong style={{ color: 'var(--text)' }}>30 ngày</strong>. Bạn có thể hủy yêu cầu bất kỳ lúc nào trong thời gian đó.
              </p>
            </div>
            <Btn variant="danger" onClick={requestDelete} disabled={deletingAcc}>Yêu cầu xóa tài khoản</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
