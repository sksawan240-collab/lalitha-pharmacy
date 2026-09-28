import { useEffect, useState } from 'react';
import api, { apiError } from '../../services/api';
import { EmptyState, Field } from '../../components/ui';
import toast from 'react-hot-toast';

export default function CategoriesAdmin() {
  const [cats, setCats] = useState(null);
  const load = () => { api.get('/admin/categories').then((r) => setCats(r.data.data.categories)).catch(() => setCats([])); };
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try { await api.post('/admin/categories', { name: fd.get('name'), description: fd.get('description') }); toast.success('Category created'); e.target.reset(); load(); }
    catch (err) { toast.error(apiError(err)); }
  };
  const toggle = async (c) => { try { await api.patch(`/admin/categories/${c._id}`, { active: !c.active }); load(); } catch (err) { toast.error(apiError(err)); } };
  const remove = async (c) => { if (!confirm(`Delete ${c.name}?`)) return; try { await api.delete(`/admin/categories/${c._id}`); load(); } catch (err) { toast.error(apiError(err)); } };
  if (!cats) return <div className="skeleton h-40" />;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form onSubmit={create} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold">+ Category</h3>
        <Field label="Name"><input name="name" required className="input" placeholder="e.g. Tablets" /></Field>
        <Field label="Description"><input name="description" className="input" /></Field>
        <button className="btn-primary w-full text-sm">Create</button>
        <p className="text-xs text-slate-400">System categories (seeded) cannot be deleted.</p>
      </form>
      <div className="space-y-2 lg:col-span-2">
        {!cats.length ? <EmptyState title="No categories yet" hint="Seed them with: npm run seed:categories" /> :
          cats.map((c) => (
            <div key={c._id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><b>{c.name}</b> <span className="text-xs text-slate-400">· {c.productCount} products {c.isSystem ? '· system' : ''} · {c.active ? 'active' : 'hidden'}</span>
                {c.description && <p className="truncate text-sm text-slate-500">{c.description}</p>}</div>
              <button onClick={() => toggle(c)} className="text-xs font-bold text-med-600">{c.active ? 'Hide' : 'Show'}</button>
              {!c.isSystem && <button onClick={() => remove(c)} className="text-xs font-bold text-rose-600">Delete</button>}
            </div>
          ))}
      </div>
    </div>
  );
}
