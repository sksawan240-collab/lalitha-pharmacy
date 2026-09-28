import { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { useSocket } from '../../context/AppContext';
import { money } from '../../utils/format';

export function Kpi({ label, value, sub, icon }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-med-100 to-pharm-100" />
      <p className="text-2xl">{icon}</p>
      <p className="font-display mt-1 text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function AdminHome() {
  const [d, setD] = useState(null);
  const { events } = useSocket();
  useEffect(() => { adminApi.overview().then((r) => setD(r.data)).catch(() => setD({})); }, [events]);
  if (!d) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-32" />)}</div>;
  const k = (v) => (v ?? 0);
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon="🧾" label="Orders" value={k(d.totals?.orders)} sub={`${k(d.totals?.pendingOrders)} pending`} />
        <Kpi icon="💰" label="Revenue" value={money(d.totals?.revenue)} sub={`${k(d.totals?.salesCount)} sales`} />
        <Kpi icon="💊" label="Products" value={k(d.totals?.products)} sub={`${k(d.totals?.lowStock)} low`} />
        <Kpi icon="👥" label="Customers" value={k(d.totals?.customers)} sub={`${k(d.totals?.staff)} staff`} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5"><h3 className="font-display font-bold">Top products</h3>
          {d.topProducts?.length ? d.topProducts.map((t) => <div key={t._id} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{t.name}</span><b>{money(t.revenue)}</b></div>) : <p className="mt-2 text-sm text-slate-400">No sales data available.</p>}</div>
        <div className="card p-5"><h3 className="font-display font-bold">Low stock now</h3>
          {d.lowStockPreview?.length ? d.lowStockPreview.map((p) => <div key={p._id} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{p.name}</span><b className="text-amber-600">{p.quantity} left</b></div>) : <p className="mt-2 text-sm text-slate-400">No low-stock products.</p>}</div>
      </div>
    </div>
  );
}
