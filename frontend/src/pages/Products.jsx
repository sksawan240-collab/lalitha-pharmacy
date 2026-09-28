import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi } from '../services/endpoints';
import ProductCard from '../components/ProductCard';
import { EmptyState, SkeletonGrid } from '../components/ui';
import { useSocket } from '../context/AppContext';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');
  const [sugg, setSugg] = useState([]);
  const { events } = useSocket();

  const read = () => ({
    q: params.get('q') || '', category: params.get('category') || '', minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '', inStock: params.get('inStock') || '', rx: params.get('rx') || '',
    sort: params.get('sort') || 'newest', page: params.get('page') || '1',
  });

  const load = async () => {
    setData(null);
    try { setData((await productApi.list({ ...read(), limit: 12 })).data); }
    catch { setData({ products: [], total: 0 }); }
  };

  useEffect(() => { productApi.categories().then((r) => setCats(r.data.categories || [])).catch(() => {}); }, []);
  useEffect(() => { setQ(params.get('q') || ''); load(); }, [params]);
  useEffect(() => { if (events[0]?.type?.startsWith('product:')) load(); }, [events]);

  useEffect(() => {
    if (!q.trim()) { setSugg([]); return; }
    const t = setTimeout(() => productApi.suggestions(q).then((r) => setSugg(r.data.suggestions || [])).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v); else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n);
  };

  const r = read();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Products</h1>
      <p className="text-sm text-slate-500">Every listing is served live from our pharmacy database.</p>

      <div className="card mt-5 space-y-3 p-4">
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && set('q', q)}
            placeholder="Search by name, generic, brand, manufacturer…" className="input pr-24" autoFocus={params.get('focus') === 'search'} />
          <button onClick={() => set('q', q)} className="btn-primary absolute right-1.5 top-1.5 !py-1.5 text-sm">Search</button>
          {sugg.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
              {sugg.map((s) => <button key={s._id} onClick={() => { setQ(s.name); set('q', s.name); setSugg([]); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-med-50">{s.name} <span className="text-slate-400">· {s.brandName}</span></button>)}
            </div>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <select value={r.category} onChange={(e) => set('category', e.target.value)} className="input text-sm">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c._id} value={c.slug || c._id}>{c.name}</option>)}
          </select>
          <input value={r.minPrice} onChange={(e) => set('minPrice', e.target.value)} placeholder="Min ₹" type="number" className="input text-sm" />
          <input value={r.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} placeholder="Max ₹" type="number" className="input text-sm" />
          <select value={r.inStock} onChange={(e) => set('inStock', e.target.value)} className="input text-sm">
            <option value="">Any availability</option><option value="true">In stock</option><option value="low">Low stock</option>
          </select>
          <select value={r.rx} onChange={(e) => set('rx', e.target.value)} className="input text-sm">
            <option value="">Rx: any</option><option value="false">No prescription</option><option value="true">Rx required</option>
          </select>
          <select value={r.sort} onChange={(e) => set('sort', e.target.value)} className="input text-sm">
            <option value="newest">Newest</option><option value="price_asc">Price ↑</option><option value="price_desc">Price ↓</option><option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        {!data ? <SkeletonGrid /> : data.products?.length ? (
          <>
            <p className="mb-3 text-sm text-slate-500">{data.total} product(s) found</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.products.map((p) => <ProductCard key={p._id} p={p} />)}</div>
            {data.pages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                {Array.from({ length: data.pages }, (_, i) => (
                  <button key={i} onClick={() => set('page', String(i + 1))} className={`h-10 w-10 rounded-xl font-bold ${String(i + 1) === (r.page || '1') ? 'bg-med-600 text-white' : 'border border-slate-200 bg-white'}`}>{i + 1}</button>
                ))}
              </div>
            )}
          </>
        ) : <EmptyState title="No products match your search" hint="Try a different name, brand or category — or browse everything." action={<button onClick={() => setParams({})} className="btn-ghost text-sm">Clear filters</button>} />}
      </div>
    </div>
  );
}
