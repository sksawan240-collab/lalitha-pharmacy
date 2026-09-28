import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { imgUrl, money } from '../utils/format';
import { cartApi, wishlistApi } from '../services/endpoints';
import toast from 'react-hot-toast';

export function stockLabel(p) {
  if (p.expiryDate && new Date(p.expiryDate) < new Date()) return { t: 'Expired', c: 'bg-slate-200 text-slate-600' };
  if (p.quantity <= 0) return { t: 'Out of stock', c: 'bg-rose-100 text-rose-700' };
  if (p.quantity <= (p.minimumStockLevel ?? 10)) return { t: `Low stock · ${p.quantity} left`, c: 'bg-amber-100 text-amber-700' };
  return { t: 'In stock', c: 'bg-emerald-100 text-emerald-700' };
}

export default function ProductCard({ p, onChanged }) {
  const s = stockLabel(p);
  const add = async () => {
    try {
      await cartApi.add({ productId: p._id, quantity: 1 });
      window.__lpRefreshCart?.();
      toast.success('Added to cart');
      onChanged?.();
    } catch (e) { toast.error(e?.response?.data?.message || 'Could not add to cart'); }
  };
  const wish = async () => {
    try { await wishlistApi.toggle(p._id); toast.success('Wishlist updated'); } catch { toast.error('Login to use wishlist'); }
  };
  return (
    <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
      className="card group overflow-hidden">
      <Link to={`/products/${p._id}`} className="relative block h-44 overflow-hidden bg-gradient-to-br from-med-50 to-pharm-50">
        {p.image ? <img src={imgUrl(p.image)} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
          : <div className="grid h-full place-items-center text-5xl">💊</div>}
        <span className={`badge absolute left-3 top-3 ${s.c}`}>{s.t}</span>
        {p.prescriptionRequired && <span className="badge absolute right-3 top-3 bg-ink-900/80 text-white">Rx required</span>}
      </Link>
      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-pharm-600">{p.category?.name || p.brandName || 'Pharmacy'}</p>
        <Link to={`/products/${p._id}`} className="font-display font-bold leading-snug hover:text-med-700">{p.name}</Link>
        <p className="mt-0.5 truncate text-xs text-slate-500">{p.genericName || p.manufacturer || ''}</p>
        <div className="mt-3 flex items-end justify-between">
          <div><p className="text-lg font-extrabold text-ink-900">{money(p.distributorPrice)}</p>
            {p.mrp > p.distributorPrice && <p className="text-xs text-slate-400 line-through">{money(p.mrp)}</p>}</div>
          <span className="text-[11px] font-semibold text-slate-500">+{p.gst || 0}% GST</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={add} disabled={p.quantity <= 0} className="btn-primary flex-1 !py-2 text-sm disabled:opacity-40">Add to cart</button>
          <button onClick={wish} className="rounded-xl border border-slate-200 px-3 hover:border-rose-300 hover:text-rose-500" aria-label="Wishlist">♡</button>
        </div>
      </div>
    </motion.div>
  );
}
