import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartApi, orderApi } from '../../services/endpoints';
import { useAuth, useSocket } from '../../context/AppContext';
import { EmptyState } from '../../components/ui';
import { fmtDateTime, money, statusColor, ORDER_FLOW } from '../../utils/format';
import toast from 'react-hot-toast';

export function CustHome() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const { events } = useSocket();
  useEffect(() => { orderApi.mine({ limit: 5 }).then((r) => setOrders(r.data)).catch(() => setOrders({ orders: [] })); }, [events]);
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold">Hello, {user?.name?.split(' ')[0]} 👋</h2>
      <p className="text-sm text-slate-500">Your pharmacy supply at a glance.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[['🛒 Shop medicines', 'Live stock & distributor pricing', '/app/products'], ['📦 Track orders', 'Real-time status timeline', '/app/orders'], ['🧾 Invoices', 'GST PDFs, emailed + downloadable', '/app/invoices']].map(([t, d, to]) => (
          <Link key={to} to={to} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-pop"><h3 className="font-display font-bold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></Link>
        ))}
      </div>
      <h3 className="font-display mb-3 mt-8 font-bold">Recent orders</h3>
      {!orders ? <div className="skeleton h-24" /> : orders.orders?.length ? (
        <div className="table-wrap"><table className="data"><thead><tr><th>Order</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
          <tbody>{orders.orders.map((o) => <tr key={o._id}><td className="font-bold">{o.orderId}</td><td><span className={`badge ${statusColor(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></td><td>{money(o.total)}</td><td>{fmtDateTime(o.createdAt)}</td></tr>)}</tbody></table></div>
      ) : <EmptyState title="No orders yet" hint="Browse live products and place your first order." action={<Link to="/app/products" className="btn-primary text-sm">Shop products</Link>} />}
    </div>
  );
}

export function Shop() {
  return <div><p className="mb-4 text-sm text-slate-500">Shop is the live storefront — same data as the public catalog.</p><Link to="/products" className="btn-primary text-sm">Open product catalog</Link></div>;
}

export function CartPage() {
  const [cart, setCart] = useState(null);
  const load = async () => { try { setCart((await cartApi.get()).data.cart); } catch { setCart({ items: [] }); } };
  useEffect(() => { load(); }, []);
  const setQty = async (id, q) => { try { await cartApi.update(id, q); load(); window.__lpRefreshCart?.(); } catch (e) { toast.error(e?.response?.data?.message || 'Update failed'); } };
  const rm = async (id) => { await cartApi.remove(id); load(); window.__lpRefreshCart?.(); };
  if (!cart) return <div className="skeleton h-40" />;
  if (!cart.items?.length) return <EmptyState title="Your cart is empty" hint="Add medicines from the live catalog." action={<Link to="/products" className="btn-primary text-sm">Browse products</Link>} />;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {cart.items.map((i) => (
          <div key={i.productId} className="card flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1"><p className="font-bold">{i.name || 'Product'}</p><p className="text-xs text-slate-500">{money(i.price)} · GST {i.gstPercent}%</p>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => setQty(i.productId, i.quantity - 1)} className="rounded-lg border px-3 py-1">−</button>
                <b>{i.quantity}</b>
                <button onClick={() => setQty(i.productId, i.quantity + 1)} className="rounded-lg border px-3 py-1">+</button>
                <button onClick={() => rm(i.productId)} className="ml-2 text-xs font-bold text-rose-600">Remove</button>
              </div></div>
            <p className="font-extrabold">{money(i.quantity * i.price * (1 + (i.gstPercent || 0) / 100))}</p>
          </div>
        ))}
      </div>
      <div className="card h-fit p-5">
        <h3 className="font-display font-bold">Summary</h3>
        <p className="mt-2 text-sm">Subtotal: <b>{money(cart.subtotal)}</b></p>
        <p className="text-sm">GST: <b>{money(cart.gstTotal)}</b></p>
        <p className="font-display mt-2 text-xl font-extrabold">Total {money(cart.total)}</p>
        <Link to="/app/checkout" className="btn-primary mt-4 w-full">Proceed to checkout</Link>
      </div>
    </div>
  );
}
