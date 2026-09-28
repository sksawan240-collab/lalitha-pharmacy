import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cartApi, productApi } from '../services/endpoints';
import { imgUrl, money, statusColor } from '../utils/format';
import { EmptyState } from '../components/ui';
import ProductCard from '../components/ProductCard';
import { stockLabel } from '../components/ProductCard';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    productApi.get(id).then((r) => {
      setP(r.data.product);
      const cat = r.data.product?.category?._id || r.data.product?.category;
      if (cat) productApi.list({ category: cat, limit: 4 }).then((x) => setRelated((x.data.products || []).filter((y) => y._id !== id))).catch(() => {});
    }).catch(() => setP(false));
  }, [id]);

  if (p === false) return <div className="mx-auto max-w-4xl px-4 py-10"><EmptyState title="Product not found" hint="It may have been removed. Browse the live catalog instead." action={<Link to="/products" className="btn-primary text-sm">Browse products</Link>} /></div>;
  if (!p) return <div className="mx-auto max-w-5xl space-y-3 px-4 py-10"><div className="skeleton h-64" /><div className="skeleton h-6 w-1/2" /></div>;

  const s = stockLabel(p);
  const add = async () => {
    try { await cartApi.add({ productId: p._id, quantity: qty }); window.__lpRefreshCart?.(); toast.success('Added to cart'); }
    catch (e) { toast.error(e?.response?.data?.message || 'Could not add to cart'); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/products" className="text-sm font-semibold text-med-600">← Back to products</Link>
      <div className="card mt-4 grid overflow-hidden md:grid-cols-2">
        <div className="relative min-h-[300px] bg-gradient-to-br from-med-50 to-pharm-50">
          {p.image ? <img src={imgUrl(p.image)} alt={p.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="grid h-full min-h-[300px] place-items-center text-7xl">💊</div>}
        </div>
        <div className="p-6 sm:p-8">
          <span className={`badge ${s.c}`}>{s.t}</span>
          {p.prescriptionRequired && <span className="badge ml-2 bg-ink-900 text-white">Rx required</span>}
          <h1 className="font-display mt-3 text-3xl font-extrabold">{p.name}</h1>
          <p className="text-sm text-slate-500">{p.genericName} · {p.brandName} · {p.manufacturer}</p>
          <div className="mt-4 flex items-end gap-2">
            <p className="text-3xl font-extrabold">{money(p.distributorPrice)}</p>
            {p.mrp > p.distributorPrice && <p className="text-slate-400 line-through">{money(p.mrp)}</p>}
            <span className="text-xs font-semibold text-slate-500">+{p.gst || 0}% GST</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{p.description || 'No description provided.'}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {[['Batch', p.batchNumber || '—'], ['Expiry', p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-IN') : '—'], ['Category', p.category?.name || '—'], ['Unit', p.unit || 'strip']].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-ink-50 px-3 py-2"><dt className="text-[11px] font-bold uppercase text-slate-400">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-200">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2 text-lg font-bold">−</button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button onClick={() => setQty(Math.min(p.quantity || 1, qty + 1))} className="px-4 py-2 text-lg font-bold">+</button>
            </div>
            <button onClick={add} disabled={p.quantity <= 0} className="btn-primary flex-1 disabled:opacity-40">Add to cart</button>
          </div>
          {p.prescriptionRequired && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">This product requires a valid prescription. You will upload it at checkout; dispatch happens only after pharmacist verification.</p>}
        </div>
      </div>
      {related.length > 0 && (
        <div className="mt-10"><h2 className="font-display mb-4 text-xl font-extrabold">Related products</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((x) => <ProductCard key={x._id} p={x} />)}</div></div>
      )}
    </div>
  );
}
