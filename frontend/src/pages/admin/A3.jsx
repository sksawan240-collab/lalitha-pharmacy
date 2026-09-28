import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/endpoints';
import { EmptyState } from '../../components/ui';
import { money, statusColor, fmtDateTime } from '../../utils/format';
import { useSocket } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { apiError } from '../../services/api';

const STATUS_FLOW = ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const TERMINAL = ['DELIVERED', 'CANCELLED', 'RETURNED'];

export function AdminOrders() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const { events } = useSocket();
  const load = () => adminApi.orders({ limit: 50, status: filter || undefined }).then((r) => setData(r.data)).catch(() => setData({ orders: [] }));
  useEffect(() => { load(); }, [filter, events]);
  const setStatus = async (id, status) => {
    try { await adminApi.updateOrderStatus(id, { status }); toast.success(`Order ${status.replace(/_/g, ' ')}`); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  if (!data) return <div className="skeleton h-40" />;
  if (!data.orders?.length) return <EmptyState title="No orders yet" hint="Customer orders appear here in real time." />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input max-w-xs"><option value="">All statuses</option><option value="ORDER_PLACED">Order Placed</option><option value="CONFIRMED">Confirmed</option><option value="PROCESSING">Processing</option><option value="PACKED">Packed</option><option value="SHIPPED">Shipped</option><option value="OUT_FOR_DELIVERY">Out for Delivery</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option><option value="RETURNED">Returned</option></select>
      </div>
      <div className="table-wrap"><table className="data"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>{data.orders.map((o) => (
          <tr key={o._id}>
            <td className="font-bold">{o.orderId}</td>
            <td className="text-xs">{o.customer?.name}<br /><span className="text-slate-400">{o.customer?.email}</span></td>
            <td>{money(o.total)}</td>
            <td><span className={`badge ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></td>
            <td className="text-xs">{fmtDateTime(o.createdAt)}</td>
            <td className="space-x-2">
              <Link to={`/admin/orders/${o._id}`} className="text-xs font-bold text-med-600">Manage</Link>
              {!TERMINAL.includes(o.status) && STATUS_FLOW.filter((s) => s !== o.status).map((s) => (
                <button key={s} onClick={() => setStatus(o._id, s)} className="text-xs font-bold text-pharm-600 hover:underline">{s.replace(/_/g, ' ')}</button>
              ))}
              {!TERMINAL.includes(o.status) && <button onClick={() => setStatus(o._id, 'CANCELLED')} className="text-xs font-bold text-rose-600 hover:underline">Cancel</button>}
            </td>
          </tr>
        ))}</tbody></table></div>
    </div>
  );
}

export function AdminOrderDetail() {
  const id = window.location.pathname.split('/').pop();
  const [o, setO] = useState(null);
  const [note, setNote] = useState('');
  useEffect(() => { adminApi.order(id).then((r) => setO(r.data.order)).catch(() => setO(false)); }, [id]);
  const setStatus = async (status) => {
    try { const r = await adminApi.updateOrderStatus(id, { status, note }); setO(r.data.order); setNote(''); toast.success(`Order ${status.replace(/_/g, ' ')} — customer notified`); }
    catch (e) { toast.error(apiError(e)); }
  };
  if (o === false) return <EmptyState title="Order not found" />;
  if (!o) return <div className="skeleton h-40" />;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="card space-y-3 p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">{o.orderId}</h2>
          <span className={`badge ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-sm text-slate-500">{o.customer?.name} · {o.customer?.email} · {o.customer?.mobile}</p>
        <div className="border-t border-slate-100 pt-2">
          {o.items?.map((i, k) => (
            <div key={k} className="flex justify-between border-b border-slate-50 py-2 text-sm">
              <span>{i.name} <span className="text-slate-400">× {i.quantity}</span></span>
              <b>{money(i.subtotal)}</b>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 font-extrabold"><span>Total</span><span>{money(o.total)}</span></div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <p><b>Ship to:</b> {o.shippingAddress?.addressLine1}, {o.shippingAddress?.city} — {o.shippingAddress?.pincode}</p>
          <p><b>Payment:</b> {o.payment?.method} ({o.payment?.status})</p>
          {o.deliveryNotes && <p><b>Notes:</b> {o.deliveryNotes}</p>}
        </div>
        {o.statusHistory?.length > 0 && (
          <div><h3 className="font-display font-bold">Status history</h3>
            {o.statusHistory.map((h, k) => <div key={k} className="flex justify-between border-t border-slate-100 py-1.5 text-xs"><span className="font-bold">{h.status.replace(/_/g, ' ')}</span><span className="text-slate-400">{fmtDateTime(h.changedAt)}</span></div>)}
          </div>
        )}
      </div>
      <div className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold">Update status</h3>
        <p className="text-xs text-slate-500">Current: <span className={`badge ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></p>
        {!TERMINAL.includes(o.status) ? (
          <>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" className="input" rows={2} />
            <div className="space-y-1.5">
              {STATUS_FLOW.map((s) => (
                <button key={s} onClick={() => setStatus(s)} className="btn-ghost w-full !py-1.5 text-xs">{s.replace(/_/g, ' ')}</button>
              ))}
              <button onClick={() => setStatus('CANCELLED')} className="w-full rounded-xl border border-rose-200 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">Cancel order</button>
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-slate-100 p-3 text-center text-xs text-slate-500">This order is {o.status.toLowerCase().replace(/_/g, ' ')} — no further changes.</p>
        )}
      </div>
    </div>
  );
}

export function InventoryAdmin() {
  const [low, setLow] = useState(null);
  const [exp, setExp] = useState(null);
  useEffect(() => {
    adminApi.lowStock().then((r) => setLow(r.data.products)).catch(() => setLow([]));
    adminApi.expiry(90).then((r) => setExp(r.data)).catch(() => setExp(null));
  }, []);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-5"><h3 className="font-display font-bold">Low stock</h3>
        {!low ? <div className="skeleton mt-3 h-24" /> : low.length ? low.map((p) => <div key={p._id} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{p.name}</span><b className="text-amber-600">{p.quantity}/{p.minimumStockLevel}</b></div>) : <p className="mt-2 text-sm text-slate-400">No low-stock products.</p>}</div>
      <div className="card p-5"><h3 className="font-display font-bold">Expiry (90 days)</h3>
        {!exp ? <div className="skeleton mt-3 h-24" /> : (<p className="text-sm">Expired: <b className="text-rose-600">{exp.expired?.length || 0}</b> · Soon: <b className="text-amber-600">{exp.expiringSoon?.length || 0}</b></p>)}</div>
    </div>
  );
}
