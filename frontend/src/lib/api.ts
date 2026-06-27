const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me: () => req('/auth/me'),

  // Users (admin)
  listStudents: () => req('/users'),
  createStudent: (data: object) => req('/users', { method: 'POST', body: JSON.stringify(data) }),
  getStudent: (id: string) => req(`/users/${id}`),
  deleteStudent: (id: string) => req(`/users/${id}`, { method: 'DELETE' }),
  requestDelete: () => req('/users/me/request-delete', { method: 'POST' }),
  cancelDelete: () => req('/users/me/cancel-delete', { method: 'POST' }),
  updateProfile: (data: object) => req('/users/me', { method: 'PUT', body: JSON.stringify(data) }),

  // Trade Plans
  getPlans: (params?: Record<string, string>) =>
    req(`/trade-plans?${new URLSearchParams(params || {})}`),
  getPlan: (id: string) => req(`/trade-plans/${id}`),
  createPlan: (data: object) => req('/trade-plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: object) =>
    req(`/trade-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id: string) => req(`/trade-plans/${id}`, { method: 'DELETE' }),

  // Journals
  getJournals: (params?: Record<string, string>) =>
    req(`/journals?${new URLSearchParams(params || {})}`),
  getJournal: (id: string) => req(`/journals/${id}`),
  createJournal: (data: object) =>
    req('/journals', { method: 'POST', body: JSON.stringify(data) }),
  updateJournal: (id: string, data: object) =>
    req(`/journals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteJournal: (id: string) => req(`/journals/${id}`, { method: 'DELETE' }),

  // Reports
  getStats: (params?: Record<string, string>) =>
    req(`/reports/stats?${new URLSearchParams(params || {})}`),
  getClassStats: () => req('/reports/class'),

  // Accounts
  getAccounts: (params?: Record<string, string>) =>
    req(`/accounts?${new URLSearchParams(params || {})}`),
  getAccount: (id: string) => req(`/accounts/${id}`),
  createAccount: (data: object) => req('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: object) =>
    req(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => req(`/accounts/${id}`, { method: 'DELETE' }),

  // Spend / Payout
  getSpend: () => req('/spend'),
  getSpendSummary: () => req('/spend/summary'),
  createSpend: (data: object) => req('/spend', { method: 'POST', body: JSON.stringify(data) }),
  updateSpend: (id: string, data: object) => req(`/spend/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSpend: (id: string) => req(`/spend/${id}`, { method: 'DELETE' }),

  // Quant Analytics
  getQuantSymbols: () => req('/quant/symbols'),
  getQuantTrades: (symbol: string) => req(`/quant/trades/${encodeURIComponent(symbol)}`),

  // Upload
  uploadScreenshot: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads/screenshot', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
};
