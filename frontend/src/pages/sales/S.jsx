import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../services/api';
import { notificationApi, salesApi } from '../../services/endpoints';
import { useSocket } from '../../context/AppContext';
import { EmptyState } from '../../components/ui';
import { fmtDateTime, money, statusColor } from '../../utils/format';
import { Kpi } from '../admin/A1';
import toast from 'react-hot-toast';

export function SalesHome() {
  const [d, setD] = useState(null);
  const { events } = useSocket();
  useEffect(() => { salesApi.overview().then((r) => setD(r.data)).catch(() => setD({})); }, [events]);
  if (!d) return <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi icon="🧾" label="Total orders" value={d.totals?.orders ?? 0} />
      <Kpi icon="⏳" label="Pending" value={d.totals?.pending ?? 0} />
      <Kpi icon="💰" label="Revenue" value={money(d.totals?.revenue)} />
      <Kpi icon="⚠" label="Low stock" value={d.totals?.lowStock ?? 0} />
    </div>
  );
}

export function SalesOrders() {
  const [data, setData] = useState(null);
  const { events } = useSocket();
  useEffect(() => { salesApi.orders({ limit: 50 }).then((r) => setData(r.data)).catch(() => setData({ orders: [] })); }, [events]);
  if (!data) return <div className="skeleton h-40" />;
  if (!data.orders?.length) return <EmptyState title="No customer orders yet" hint="New orders arrive here in real time." />;
  return (
    <div className="table-wrap"><table className="data"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th /></tr></thead>
      <tbody>{data.orders.map((o) => <tr key={o._id}><td className="font-bold">{o.orderId}</td><td className="text-xs">{o.customer?.name}<br /><span className="text-slate-400">{o.customer?.email}</span></td><td>{money(o.total)}</td><td><span className={`badge ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></td><td><Link to={`/sales/orders/${o._id}`} className="font-bold text-med-600">Manage</Link></td></tr>)}</tbody></table></div>
  );
}

const FLOW = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export function SalesOrderDetail() {
  const id = window.location.pathname.split('/').pop();
  const [o, setO] = useState(null);
  useEffect(() => { salesApi.order(id).then((r) => setO(r.data.order)).catch(() => setO(false)); }, [id]);
  if (o === false) return <EmptyState title="Order not found" />;
  if (!o) return <div className="skeleton h-40" />;
  const setStatus = async (status) => {
    try { const r = await salesApi.updateStatus(id, { status }); setO(r.data.order); toast.success(`Order ${status} — customer emailed`); }
    catch (e) { toast.error(apiError(e)); }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="card space-y-2 p-5 lg:col-span-2">
        <h2 className="font-display text-xl font-extrabold">{o.orderId}</h2>
        <p className="text-sm text-slate-500">{o.customer?.name} · {o.customer?.email} · {o.customer?.mobile}</p>
        {o.items?.map((i, k) => <div key={k} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{i.name} × {i.quantity}</span><b>{money(i.lineTotal)}</b></div>)}
        <p className="font-extrabold">Total {money(o.total)}</p>
        <p className="text-xs text-slate-400">{o.shippingAddress?.line}, {o.shippingAddress?.city} — {o.shippingAddress?.pincode}</p>
      </div>
      <div className="card h-fit space-y-2 p-5">
        <h3 className="font-display font-bold">Update status</h3>
        <p className="text-xs">Current: <span className={`badge ${statusColor(o.status)}`}>{o.status}</span></p>
        {FLOW.map((s) => <button key={s} onClick={() => setStatus(s)} className="btn-ghost w-full !py-1.5 text-xs">{s.replace(/_/g, ' ')}</button>)}
        <button onClick={() => setStatus('CANCELLED')} className="w-full rounded-xl border border-rose-200 py-1.5 text-xs font-bold text-rose-600">Cancel order</button>
      </div>
    </div>
  );
}

export function SalesMisc({ kind }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (kind === 'customers') salesApi.customers({ limit: 50 }).then((r) => setData(r.data.customers)).catch(() => setData([]));
    if (kind === 'products') api.get('/products', { params: { limit: 50 } }).then((r) => setData(r.data.data.products)).catch(() => setData([]));
    if (kind === 'low') salesApi.lowStock().then((r) => setData(r.data.products)).catch(() => setData([]));
    if (kind === 'notifs') notificationApi.list({ limit: 30 }).then((r) => setData(r.data.notifications)).catch(() => setData([]));
  }, [kind]);
  if (!data) return <div className="skeleton h-40" />;
  if (!data.length) return <EmptyState title={kind === 'customers' ? 'No customers yet' : kind === 'low' ? 'No low-stock products' : 'Nothing here yet'} />;
  if (kind === 'customers') return <div className="table-wrap"><table className="data"><thead><tr><th>Customer</th><th>Contact</th><th>Joined</th></tr></thead><tbody>{data.map((u) => <tr key={u._id}><td><b>{u.name}</b></td><td className="text-xs">{u.email}<br />{u.mobile}</td><td className="text-xs">{fmtDateTime(u.createdAt)}</td></tr>)}</tbody></table></div>;
  if (kind === 'products') return <div className="table-wrap"><table className="data"><thead><tr><th>Product</th><th>Price</th><th>Stock</th></tr></thead><tbody>{data.map((p) => <tr key={p._id}><td><b>{p.name}</b></td><td>{money(p.distributorPrice)}</td><td>{p.quantity}</td></tr>)}</tbody></table></div>;
  return <div className="space-y-2">{data.map((n) => <div key={n._id || n._id} className="card p-4"><b>{n.title || n.name}</b><p className="text-sm text-slate-500">{n.message || `${n.quantity} units left`}</p></div>)}</div>;
}
