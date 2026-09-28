export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const imgUrl = (p) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, '');
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
};
export const statusColor = (s) => ({
  PLACED: 'bg-blue-100 text-blue-700', CONFIRMED: 'bg-indigo-100 text-indigo-700',
  PROCESSING: 'bg-amber-100 text-amber-700', PACKED: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-cyan-100 text-cyan-700', OUT_FOR_DELIVERY: 'bg-teal-100 text-teal-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
  RETURNED: 'bg-slate-200 text-slate-700', PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-rose-100 text-rose-700',
}[s] || 'bg-slate-100 text-slate-600');
export const ORDER_FLOW = ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
