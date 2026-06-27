import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import { api } from './lib/api';

import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/student/Dashboard';
import MindMap from './pages/student/MindMap';
import TradePlan from './pages/student/TradePlan';
import JournalIdea from './pages/student/JournalIdea';
import JournalPsychology from './pages/student/JournalPsychology';
import Reports from './pages/student/Reports';
import Settings from './pages/student/Settings';
import AccountsPage from './pages/student/Accounts';
import SpendPayout from './pages/student/SpendPayout';
import QuantAnalytics from './pages/student/QuantAnalytics';
import AdminOverview from './pages/admin/Overview';
import StudentList from './pages/admin/StudentList';
import StudentDetail from './pages/admin/StudentDetail';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function AuthGate({ children }: { children: React.ReactNode }) {
  const { token, user, setAuth, logout } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      api.me().then(u => setAuth(token, u)).catch(() => logout());
    }
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;
    const es = new EventSource(`/api/notifications/stream?token=${token}`);
    es.addEventListener('plan_graded', (e) => {
      try {
        const data = JSON.parse(e.data);
        toast.success(`Giảng viên đã chấm điểm kế hoạch "${data.title}": ${data.grade || 'Đã nhận xét'}`);
        qc.invalidateQueries();
      } catch (err) {
        console.error(err);
      }
    });
    return () => es.close();
  }, [token, user]);

  if (!token) return <Navigate to="/login" replace />;
  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Đang tải...
    </div>
  );
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireStudent({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e2230', color: '#e2e8f0', border: '1px solid #2a2f3e' } }} />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<AuthGate><RequireStudent><Layout><MindMap /></Layout></RequireStudent></AuthGate>} />
          <Route path="/dashboard" element={<AuthGate><RequireStudent><Layout><MindMap /></Layout></RequireStudent></AuthGate>} />
          <Route path="/stats" element={<AuthGate><RequireStudent><Layout><Dashboard /></Layout></RequireStudent></AuthGate>} />
          <Route path="/plans" element={<AuthGate><RequireStudent><Layout><TradePlan /></Layout></RequireStudent></AuthGate>} />
          <Route path="/journal/idea" element={<AuthGate><RequireStudent><Layout><JournalIdea /></Layout></RequireStudent></AuthGate>} />
          <Route path="/journal/psychology" element={<AuthGate><RequireStudent><Layout><JournalPsychology /></Layout></RequireStudent></AuthGate>} />
          <Route path="/accounts" element={<AuthGate><RequireStudent><Layout><AccountsPage /></Layout></RequireStudent></AuthGate>} />
          <Route path="/reports" element={<AuthGate><RequireStudent><Layout><Reports /></Layout></RequireStudent></AuthGate>} />
          <Route path="/spend" element={<AuthGate><RequireStudent><Layout><SpendPayout /></Layout></RequireStudent></AuthGate>} />
          <Route path="/quant" element={<AuthGate><RequireStudent><Layout><QuantAnalytics /></Layout></RequireStudent></AuthGate>} />
          <Route path="/settings" element={<AuthGate><RequireStudent><Layout><Settings /></Layout></RequireStudent></AuthGate>} />

          <Route path="/admin" element={<AuthGate><RequireAdmin><Layout><AdminOverview /></Layout></RequireAdmin></AuthGate>} />
          <Route path="/admin/students" element={<AuthGate><RequireAdmin><Layout><StudentList /></Layout></RequireAdmin></AuthGate>} />
          <Route path="/admin/students/:id" element={<AuthGate><RequireAdmin><Layout><StudentDetail /></Layout></RequireAdmin></AuthGate>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
