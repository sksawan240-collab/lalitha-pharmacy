import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../services/endpoints';
import { useSocket } from '../../context/AppContext';
import { EmptyState } from '../../components/ui';
import { fmtDateTime, money, statusColor, ORDER_FLOW } from '../../utils/format';
import { apiError } from '../../services/api';
import toast from 'react-hot-toast';

export function Orders() {
  const [data, setData] = useState(null);
  const { events } = useSocket();
  useEffect(() => { orderApi.mine().then((r) => setData(r.data)).catch(() => setData({ orders: [] })); }, [events]);
  if (!data) return <div className="skeleton h-40" />;
  if (!data.orders?.length) return <EmptyState title="No orders found" hint="Your orders will appear here with live tracking." action={<Link to="/products" className="btn-primary text-sm">Shop products</Link>} />;
  return (
    <div className="table-wrap"><table className="data"><thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th /></tr></thead>
      <tbody>{data.orders.map((o) => <tr key={o._id}><td className="font-bold">{o.orderId}</td><td>{o.items?.length}</td><td>{money(o.total)}</td>
        <td><span className={`badge ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></td><td>{fmtDateTime(o.createdAt)}</td>
        <td><Link to={`/app/orders/${o._id}`} className="font-bold text-med-600">View</Link></td></tr>)}</tbody></table></div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const { events } = useSocket();
  useEffect(() => { orderApi.get(id).then((r) => setO(r.data.order)).catch(() => setO(false)); }, [id, events]);
  if (o === false) return <EmptyState title="Order not found" />;
  if (!o) return <div className="skeleton h-40" />;
  const idx = ORDER_FLOW.indexOf(o.status);
  const cancel = async () => { try { await orderApi.cancel(id); toast.success('Order cancelled'); } catch (e) { toast.error(apiError(e)); } };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="card p-5">
          <div className="flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">{o.orderId}</h2><span className={`badge ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></div>
          <div className="mt-5">
            {ORDER_FLOW.map((s, i) => {
              const h = o.statusHistory?.find((x) => x.status === s);
              const done = idx >= 0 && i <= idx;
              return (
                <div key={s} className="flex gap-3">
                  <div className="flex flex-col items-center"><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${done ? 'bg-pharm-500 text-white' : 'bg-slate-200'}`}>{done ? '✓' : i + 1}</span>{i < ORDER_FLOW.length - 1 && <span className={`w-0.5 flex-1 ${done ? 'bg-pharm-300' : 'bg-slate-200'}`} style={{ minHeight: 22 }} />}</div>
                  <div className="pb-4"><p className="text-sm font-bold">{s.replace(/_/g, ' ')}</p><p className="text-xs text-slate-400">{h ? fmtDateTime(h.at) : 'Pending'}</p></div>
                </div>
              );
            })}
          </div>
          {['PLACED', 'CONFIRMED'].includes(o.status) && <button onClick={cancel} className="mt-2 text-sm font-bold text-rose-600">Cancel order</button>}
        </div>
        <div className="card p-5"><h3 className="font-display font-bold">Items</h3>
          {o.items?.map((i, k) => <div key={k} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{i.name} × {i.quantity}</span><b>{money(i.lineTotal)}</b></div>)}
          <p className="font-display mt-2 text-lg font-extrabold">Total <span className="float-right">{money(o.total)}</span></p>
        </div>
      </div>
      <div className="card h-fit p-5 text-sm"><h3 className="font-display font-bold">Delivery</h3><p className="mt-2">{o.shippingAddress?.line}, {o.shippingAddress?.city} — {o.shippingAddress?.pincode}</p><p className="mt-2">Payment: <b>{o.payment?.method} / {o.payment?.status}</b></p>{o.invoice && <Link to="/app/invoices" className="btn-ghost mt-4 w-full text-sm">View invoice</Link>}</div>
    </div>
  );
}
