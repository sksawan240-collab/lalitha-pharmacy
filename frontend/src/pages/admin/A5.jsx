import { useEffect, useState } from 'react';
import api, { apiError } from '../../services/api';
import { adminApi, notificationApi } from '../../services/endpoints';
import { EmptyState, Field } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';
import toast from 'react-hot-toast';

export function MiscAdmin({ kind }) {
  const [data, setData] = useState(null);
  const load = () => {
    if (kind === 'audit') adminApi.audit({ limit: 50 }).then((r) => setData(r.data.logs)).catch(() => setData([]));
    if (kind === 'notifs') notificationApi.list({ limit: 50 }).then((r) => setData(r.data.notifications)).catch(() => setData([]));
    if (kind === 'ann') api.get('/announcements').then((r) => setData(r.data.data.announcements)).catch(() => setData([]));
  };
  useEffect(load, [kind]);
  const publish = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await api.post('/announcements/admin', { title: fd.get('t'), content: fd.get('b'), important: !!fd.get('i') });
      const id = res.data?.data?.announcement?._id;
      if (id) {
        await api.patch(`/announcements/admin/${id}/publish`);
      }
      toast.success('Published & sent to users'); e.target.reset(); load();
    }
    catch (err) { toast.error(apiError(err)); }
  };
  if (!data) return <div className="skeleton h-40" />;
  if (kind === 'ann') return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={publish} className="card h-fit space-y-3 p-5"><h3 className="font-display font-bold">New announcement</h3>
        <Field label="Title"><input name="t" required className="input" /></Field>
        <Field label="Body"><textarea name="b" required className="input" rows={4} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="i" /> Important (email all)</label>
        <button className="btn-primary text-sm">Publish</button></form>
      <div className="space-y-2 lg:col-span-2">{!data.length ? <EmptyState title="No announcements yet" /> : data.map((a) => <div key={a._id} className="card p-4"><b>{a.title}</b><p className="text-sm text-slate-500">{a.content}</p></div>)}</div>
    </div>
  );
  if (kind === 'audit') return (!data.length ? <EmptyState title="No audit activity yet" /> : <div className="table-wrap"><table className="data"><thead><tr><th>Action</th><th>Actor</th><th>When</th></tr></thead><tbody>{data.map((l) => <tr key={l._id}><td className="font-bold">{l.action}</td><td className="text-xs">{l.user?.email || l.ip}</td><td className="text-xs">{fmtDateTime(l.createdAt)}</td></tr>)}</tbody></table></div>);
  return (!data.length ? <EmptyState title="No notifications" /> : <div className="space-y-2">{data.map((n) => <div key={n._id} className="card p-4"><b>{n.title}</b><p className="text-sm text-slate-500">{n.message}</p></div>)}</div>);
}
