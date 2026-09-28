import { useEffect, useState } from 'react';
import api from '../../services/api';
import { adminApi, notificationApi } from '../../services/endpoints';
import { EmptyState, Field } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';
import { apiError } from '../../services/api';
import toast from 'react-hot-toast';

export function UsersAdmin() {
  const [data, setData] = useState(null);
  const [role, setRole] = useState('');
  const load = async () => { try { setData((await adminApi.users({ role: role || undefined, limit: 50 })).data); } catch { setData({ users: [] }); } };
  useEffect(() => { load(); }, [role]);
  const add = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try { await adminApi.createStaff({ name: fd.get('name'), email: fd.get('email'), mobile: fd.get('mobile') }); toast.success('Sales operator created'); e.target.reset(); load(); }
    catch (err) { toast.error(apiError(err)); }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold">+ Sales operator</h3>
        <Field label="Name"><input name="name" required className="input" /></Field>
        <Field label="Email"><input name="email" type="email" required className="input" /></Field>
        <Field label="Mobile"><input name="mobile" required className="input" /></Field>
        <button className="btn-primary w-full text-sm">Create</button>
      </form>
      <div className="lg:col-span-2">
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input mb-3 max-w-xs"><option value="">All roles</option><option value="CUSTOMER">Customers</option><option value="SALES_OPERATOR">Sales operators</option><option value="ADMIN">Admins</option></select>
        {!data ? <div className="skeleton h-40" /> : !data.users?.length ? <EmptyState title="No users yet" /> : (
          <div className="table-wrap"><table className="data"><thead><tr><th>User</th><th>Role</th><th /></tr></thead>
            <tbody>{data.users.map((u) => <tr key={u._id}><td><b>{u.name}</b><br /><span className="text-xs text-slate-400">{u.email}</span></td><td className="text-xs font-bold">{u.role}</td>
              <td><button onClick={() => adminApi.updateUser(u._id, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }).then(load)} className="text-xs font-bold text-med-600">{u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button></td></tr>)}</tbody></table></div>)}
      </div>
    </div>
  );
}

export function AnalyticsAdmin() {
  const [d, setD] = useState(null);
  useEffect(() => { adminApi.analytics().then((r) => setD(r.data)).catch(() => setD({})); }, []);
  if (!d) return <div className="skeleton h-60" />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5"><h3 className="font-display font-bold">Orders by status</h3>
        {d.orderStatusBreakdown?.length ? d.orderStatusBreakdown.map((s, i) => <div key={s._id || i} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{s._id}</span><b>{s.count}</b></div>) : <p className="text-sm text-slate-400">No data available yet.</p>}</div>
      <div className="card p-5"><h3 className="font-display font-bold">Revenue trend</h3>
        {d.salesTrend?.length ? d.salesTrend.map((s, i) => <div key={s._id || i} className="border-t border-slate-100 py-2 text-sm"><b>{JSON.stringify(s._id)}</b> — {s.count} orders</div>) : <p className="text-sm text-slate-400">No data available yet.</p>}</div>
    </div>
  );
}
