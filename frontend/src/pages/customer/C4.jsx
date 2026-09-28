import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { invoiceApi, notificationApi, userApi, wishlistApi } from '../../services/endpoints';
import { useAuth } from '../../context/AppContext';
import { EmptyState, Field } from '../../components/ui';
import { fmtDateTime, money } from '../../utils/format';
import { apiError } from '../../services/api';
import toast from 'react-hot-toast';

async function downloadInvoice(id, filename) {
  // Session auth: the HTTP-only session cookie is sent automatically — no tokens in
  // localStorage, headers or URLs.
  const r = await invoiceApi.download(id);
  const url = URL.createObjectURL(r);
  const a = document.createElement('a');
  a.href = url; a.download = filename || `invoice-${id}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function Invoices() {
  const [data, setData] = useState(null);
  useEffect(() => { invoiceApi.mine().then((r) => setData(r.data)).catch(() => setData({ invoices: [] })); }, []);
  const dl = async (i) => { try { await downloadInvoice(i._id, `${i.invoiceNumber}.pdf`); } catch { toast.error('Download failed'); } };
  if (!data) return <div className="skeleton h-40" />;
  if (!data.invoices?.length) return <EmptyState title="No invoices yet" hint="Invoices generate automatically when you place an order." />;
  return (
    <div className="table-wrap"><table className="data"><thead><tr><th>Invoice</th><th>Order</th><th>Total</th><th>Date</th><th /></tr></thead>
      <tbody>{data.invoices.map((i) => <tr key={i._id}><td className="font-bold">{i.invoiceNumber}</td><td>{i.order?.orderId || '—'}</td><td>{money(i.totalAmount)}</td><td>{fmtDateTime(i.createdAt)}</td>
        <td><button onClick={() => dl(i)} className="font-bold text-med-600">Download</button></td></tr>)}</tbody></table></div>
  );
}

export function Wishlist() {
  const [items, setItems] = useState(null);
  useEffect(() => { wishlistApi.list().then((r) => setItems(r.data.wishlist || [])).catch(() => setItems([])); }, []);
  if (!items) return <div className="skeleton h-32" />;
  if (!items.length) return <EmptyState title="Wishlist is empty" hint="Tap the heart on any product to save it here." action={<Link to="/products" className="btn-primary text-sm">Discover products</Link>} />;
  return <div className="grid gap-3">{items.map((p) => <Link key={p._id} to={`/products/${p._id}`} className="card flex items-center gap-4 p-4"><span className="text-3xl">💊</span><span className="font-bold">{p.name}</span><span className="ml-auto font-extrabold">{money(p.distributorPrice)}</span></Link>)}</div>;
}

export function Notifs() {
  const [data, setData] = useState(null);
  const load = async () => { try { setData((await notificationApi.list({ limit: 50 })).data); } catch { setData({ notifications: [] }); } };
  useEffect(() => { load(); }, []);
  if (!data) return <div className="skeleton h-32" />;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-bold">Notifications</h2><button onClick={() => notificationApi.readAll().then(load)} className="text-sm font-bold text-med-600">Mark all read</button></div>
      {!data.notifications?.length ? <EmptyState title="No notifications" hint="Order updates and announcements will appear here." /> :
        <div className="space-y-2">{data.notifications.map((n) => <div key={n._id} className={`card flex gap-3 p-4 ${n.read ? 'opacity-70' : ''}`}><span className="text-xl">🔔</span><div><p className="font-bold">{n.title}</p><p className="text-sm text-slate-500">{n.message}</p><button onClick={() => notificationApi.read(n._id).then(load)} className="mt-1 text-xs font-bold text-med-600">Mark read</button></div></div>)}</div>}
    </div>
  );
}

export function Profile() {
  const { user, setUser } = useAuth();
  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try { const r = await userApi.update({ name: fd.get('name'), mobile: fd.get('mobile'), address: fd.get('address'), city: fd.get('city'), state: fd.get('state'), pincode: fd.get('pincode') }); setUser(r.data.user); toast.success('Profile updated'); }
    catch (err) { toast.error(apiError(err)); }
  };
  const pw = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try { await userApi.password({ currentPassword: fd.get('a'), newPassword: fd.get('b') }); toast.success('Password changed'); e.target.reset(); }
    catch (err) { toast.error(apiError(err)); }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={save} className="card space-y-3 p-5">
        <h3 className="font-display font-bold">Profile</h3>
        <Field label="Name"><input className="input" name="name" defaultValue={user?.name} /></Field>
        <Field label="Mobile"><input className="input" name="mobile" defaultValue={user?.mobile} /></Field>
        <Field label="Address"><input className="input" name="address" defaultValue={user?.address} /></Field>
        <div className="grid grid-cols-3 gap-2"><Field label="City"><input className="input" name="city" defaultValue={user?.city} /></Field><Field label="State"><input className="input" name="state" defaultValue={user?.state} /></Field><Field label="Pincode"><input className="input" name="pincode" defaultValue={user?.pincode} /></Field></div>
        <button className="btn-primary">Save changes</button>
      </form>
      <form onSubmit={pw} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold">Change password</h3>
        <Field label="Current password"><input className="input" type="password" name="a" required /></Field>
        <Field label="New password (min 8)"><input className="input" type="password" name="b" required minLength={8} /></Field>
        <button className="btn-ghost">Update password</button>
        <p className="text-xs text-slate-400">{user?.role} · {user?.email}</p>
      </form>
    </div>
  );
}
