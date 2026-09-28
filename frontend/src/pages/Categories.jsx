import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../services/endpoints';
import { EmptyState } from '../components/ui';

const ICONS = { Tablets: '💊', Capsules: '💊', Syrups: '🧴', Injections: '💉', Creams: '� cream', Drops: '💧', 'Medical Devices': '🩺', 'Surgical Supplies': '🩹', 'First Aid': '⛑', Vitamins: '🍊', 'Healthcare Products': '❤', 'Personal Care': '🧼' };

export default function Categories() {
  const [cats, setCats] = useState(null);
  useEffect(() => { productApi.categories().then((r) => setCats(r.data.categories || [])).catch(() => setCats([])); }, []);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Categories</h1>
      <p className="text-sm text-slate-500">System categories defined by the pharmacy. Products appear inside them automatically.</p>
      {!cats ? <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-32" />)}</div>
        : cats.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cats.map((c) => (
              <Link key={c._id} to={`/products?category=${encodeURIComponent(c.slug || c._id)}`} className="card group p-5 transition hover:-translate-y-1 hover:shadow-pop">
                <div className="text-4xl">{ICONS[c.name] || '⚕'}</div>
                <h3 className="font-display mt-2 font-bold group-hover:text-med-700">{c.name}</h3>
                <p className="text-xs text-slate-500">{c.productCount ?? ''} {c.description || 'Browse products →'}</p>
              </Link>
            ))}
          </div>
        ) : <div className="mt-6"><EmptyState title="No categories yet" hint="Categories are managed by the pharmacy administrator." /></div>}
    </div>
  );
}
