import { useEffect, useState } from 'react';
import { adminApi, productApi } from '../../services/endpoints';
import { EmptyState, Field } from '../../components/ui';
import { money } from '../../utils/format';
import { apiError } from '../../services/api';
import toast from 'react-hot-toast';

export function ProductsAdmin() {
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const load = async () => { try { setData((await adminApi.products({ limit: 50 })).data); } catch { setData({ products: [] }); } };
  useEffect(() => { load(); productApi.categories().then((r) => setCats(r.data.categories || [])).catch(() => {}); }, []);
  const save = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      if (form?._id) await adminApi.updateProduct(form._id, fd);
      else await adminApi.createProduct(fd);
      toast.success('Saved — live on storefront');
      setForm(null); load();
    } catch (err) { toast.error(apiError(err, 'Save failed')); }
  };
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-extrabold">Products</h2><button onClick={() => setForm({})} className="btn-primary text-sm">+ Add</button></div>
      {form && (
        <form onSubmit={save} className="card mb-5 grid gap-3 p-5 sm:grid-cols-3">
          <Field label="Name"><input name="name" defaultValue={form.name} required className="input" /></Field>
          <Field label="Category">
            <select name="category" defaultValue={form.category?._id || form.category} required className="input">
              <option value="">— Select category —</option>
              {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand"><input name="brandName" defaultValue={form.brandName} className="input" /></Field>
          <Field label="Generic"><input name="genericName" defaultValue={form.genericName} className="input" /></Field>
          <Field label="MRP"><input name="mrp" type="number" step="0.01" defaultValue={form.mrp} required className="input" /></Field>
          <Field label="Price"><input name="distributorPrice" type="number" step="0.01" defaultValue={form.distributorPrice} required className="input" /></Field>
          <Field label="Qty"><input name="quantity" type="number" defaultValue={form.quantity ?? 0} className="input" /></Field>
          <Field label="Expiry"><input name="expiryDate" type="date" defaultValue={form.expiryDate?.slice(0, 10)} className="input" /></Field>
          <Field label="Image"><input type="file" name="image" accept="image/*" className="text-sm" /></Field>
          <div className="flex gap-2 sm:col-span-3"><button className="btn-primary text-sm">Save</button><button type="button" onClick={() => setForm(null)} className="btn-ghost text-sm">Cancel</button></div>
          {cats.length === 0 ? <p className="text-xs text-amber-600 sm:col-span-3">⚠ No categories exist yet. Create one in the Categories tab first.</p> : null}
        </form>
      )}
      {!data ? <div className="skeleton h-40" /> : !data.products?.length ? <EmptyState title="No products have been added yet" /> : (
        <div className="table-wrap"><table className="data"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th /></tr></thead>
          <tbody>{data.products.map((p) => <tr key={p._id}><td><b>{p.name}</b></td><td>{money(p.distributorPrice)}</td><td>{p.quantity}</td>
            <td className="whitespace-nowrap"><button onClick={() => setForm(p)} className="mr-2 font-bold text-med-600">Edit</button><button onClick={() => confirm('Delete?') && adminApi.deleteProduct(p._id).then(load)} className="font-bold text-rose-600">Delete</button></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
