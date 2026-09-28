import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { productApi } from '../services/endpoints';
import { useAuth } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { EmptyState, SkeletonGrid } from '../components/ui';

// Animation variants
const fadeInUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
const staggerContainer = { initial: {}, whileInView: { transition: { staggerChildren: 0.1 } }, viewport: { once: true } };
const scaleIn = { initial: { opacity: 0, scale: 0.8 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.4 } };
const slideInLeft = { initial: { opacity: 0, x: -50 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
const slideInRight = { initial: { opacity: 0, x: 50 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const CAT_ICONS = {
  prescription: '℞', otc: '💊', device: '🩺', personal: '🧴', mother: '🍼',
  baby: '🍼', nutrition: '🌿', supplement: '🌿', diabetes: '💧', ayurveda: '🌱',
  herbal: '🌱', 'first aid': '⛑', emergency: '⛑', vitamin: '🍊', wellness: '🧘',
};
const catIcon = (name = '') => {
  const n = name.toLowerCase();
  const key = Object.keys(CAT_ICONS).find((k) => n.includes(k));
  return CAT_ICONS[key] || '⚕';
};

const PERKS = [
  { icon: '🚚', title: 'Fast Delivery', sub: 'At your doorstep', cls: 'bg-blue-100 text-blue-600' },
  { icon: '✅', title: 'Genuine Products', sub: '100% authentic', cls: 'bg-emerald-100 text-emerald-600' },
  { icon: '🎧', title: '24/7 Support', sub: 'We are here to help', cls: 'bg-cyan-100 text-cyan-600' },
  { icon: '🎁', title: 'Special Offers', sub: 'Great savings', cls: 'bg-rose-100 text-rose-600' },
];

const PROMOS = [
  { name: 'Healthcare Devices', cls: 'from-emerald-400 to-emerald-300', emoji: '🩺' },
  { name: 'Personal Care', cls: 'from-rose-400 to-pink-300', emoji: '🧴' },
  { name: 'Nutrition & Supplements', cls: 'from-amber-400 to-orange-300', emoji: '🍊' },
];

// Pharmacy Timeline Milestones
const TIMELINE = [
  { year: '2015', title: 'Founded', desc: 'Lalitha Pharmacy started with a vision to provide genuine medicines.', icon: '🏛️', color: 'bg-blue-500' },
  { year: '2017', title: 'Pan-India Delivery', desc: 'Expanded delivery network across all major cities in India.', icon: '🚚', color: 'bg-green-500' },
  { year: '2019', title: 'Online Platform', desc: 'Launched our e-commerce platform for easy online ordering.', icon: '💻', color: 'bg-purple-500' },
  { year: '2021', title: 'AI Assistant', desc: 'Introduced AI-powered chatbot for instant customer support.', icon: '🤖', color: 'bg-cyan-500' },
  { year: '2023', title: '1M+ Orders', desc: 'Successfully delivered over 1 million orders to happy customers.', icon: '🎉', color: 'bg-orange-500' },
  { year: '2025', title: 'Smart Pharmacy', desc: 'IoT-enabled inventory & real-time prescription verification.', icon: '⚡', color: 'bg-rose-500' },
];

// Advanced Features
const ADVANCED_FEATURES = [
  { icon: '🤖', title: 'AI Health Assistant', desc: 'Get instant answers about medicines, dosages, and health queries from our intelligent chatbot.', color: 'from-violet-500 to-purple-600' },
  { icon: '📱', title: 'Real-time Tracking', desc: 'Track your medicine orders in real-time with live delivery updates and notifications.', color: 'from-blue-500 to-cyan-600' },
  { icon: '🔒', title: 'Secure Prescriptions', desc: 'Upload and manage prescriptions securely with AI-powered verification system.', color: 'from-emerald-500 to-green-600' },
  { icon: '💊', title: 'Smart Refill', desc: 'Never run out of medicines with automatic refill reminders and easy reorder.', color: 'from-orange-500 to-red-600' },
  { icon: '🧬', title: 'Generic Alternatives', desc: 'AI suggests cost-effective generic alternatives for your prescribed medicines.', color: 'from-pink-500 to-rose-600' },
  { icon: '📊', title: 'Health Analytics', desc: 'Personalized health insights based on your purchase history and patterns.', color: 'from-amber-500 to-yellow-600' },
];

// Animated Medicine Types
const MEDICINE_ANIMATIONS = [
  { type: 'Tablets', icon: '💊', animation: { y: [0, -15, 0], rotate: [0, 10, -10, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } } },
  { type: 'Capsules', icon: '💉', animation: { x: [0, 10, -10, 0], scale: [1, 1.1, 1], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } } },
  { type: 'Syrup', icon: '🧴', animation: { y: [0, -10, 0], rotate: [0, -5, 5, 0], transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } } },
  { type: 'Injection', icon: '💉', animation: { scale: [1, 1.15, 1], y: [0, -8, 0], transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } } },
  { type: 'Cream', icon: '🧪', animation: { rotate: [0, 15, -15, 0], x: [0, 8, -8, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } } },
  { type: 'Drops', icon: '💧', animation: { y: [0, -12, 0], opacity: [1, 0.7, 1], transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } } },
];

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [cats, setCats] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [tab, setTab] = useState('best');
  const [q, setQ] = useState('');

  useEffect(() => {
    productApi.categories().then((r) => setCats(r.data.categories || [])).catch(() => setCats([]));
    productApi.list({ limit: 12, sort: 'newest' }).then((r) => setFeatured(r.data.products || [])).catch(() => setFeatured([]));
  }, []);

  const lists = useMemo(() => ({
    best: (featured || []).filter((p) => p.quantity > 0),
    new: featured || [],
    offers: (featured || []).filter((p) => (p.discountPercent || 0) > 0 || (p.mrp || 0) > (p.distributorPrice || 0)),
  }), [featured]);

  const promoLink = (label) => {
    const c = (cats || []).find((x) => x.name.toLowerCase().includes(label.toLowerCase().split(' ')[0]));
    return c ? `/products?category=${encodeURIComponent(c.slug || c._id)}` : '/products';
  };

  const submitSearch = (e) => { e.preventDefault(); nav(`/products?q=${encodeURIComponent(q)}`); };
  const visible = lists[tab] || [];

  return (
    <div>
      {/* ── Sidebar + Hero ─────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pt-6 sm:px-6 lg:grid-cols-[250px_1fr]">
        <aside className="card h-fit p-3 lg:sticky lg:top-[130px]">
          <Link to="/categories" className="mb-2 flex items-center justify-center gap-2 rounded-full bg-blue-600 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-blue-700">
            <span>☰</span> All Categories
          </Link>
          <nav className="space-y-0.5">
            {!cats ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton my-1.5 h-8" />)
              : cats.slice(0, 9).map((c) => (
                <Link key={c._id} to={`/products?category=${encodeURIComponent(c.slug || c._id)}`}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                  <span className="text-base">{catIcon(c.name)}</span>
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            <Link to="/categories" className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100">
              <span className="text-base">🗂</span> View All Categories
            </Link>
          </nav>
        </aside>

        <div className="grid gap-5 xl:grid-cols-[1fr_230px]">
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-400 p-8 text-white shadow-pop sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-25">
              <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 800 320">
                <path className="pulse-line" d="M0 220 H200 L225 220 240 180 255 255 270 220 H500 L525 220 540 190 555 245 570 220 H800" fill="none" stroke="#bae6fd" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="pointer-events-none absolute -bottom-6 right-4 hidden select-none text-[9rem] leading-none opacity-30 md:block">💊</div>
            <div className="pointer-events-none absolute right-28 top-6 hidden select-none text-5xl opacity-40 md:block">🛡️</div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.35em] text-cyan-100">Welcome to</p>
            <h1 className="font-display mt-1 text-4xl font-extrabold sm:text-5xl">Lalitha Pharmacy</h1>
            <p className="mt-3 max-w-md text-cyan-50">Wide range of medicines and healthcare products at your fingertips</p>
            <form onSubmit={submitSearch} className="mt-6 flex max-w-md overflow-hidden rounded-full bg-white p-1 shadow-lg">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for medicines, healthcare products..."
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-700 outline-none" />
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700" aria-label="Search">🔍</button>
            </form>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to={user ? '/app' : '/login'} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold shadow-pop transition hover:bg-emerald-700">
                ⬆ Upload Prescription
              </Link>
              <span className="text-sm font-semibold text-cyan-50">Get your medicines<br className="hidden sm:block" /> delivered safely</span>
            </div>
          </motion.section>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {PERKS.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                className="card flex items-center gap-3 p-3.5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl ${p.cls}`}>{p.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold">{p.title}</span>
                  <span className="block truncate text-xs text-slate-500">{p.sub}</span>
                </span>
                <span className="ml-auto text-slate-300">›</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      {/* ── Promo banners ──────────────────────────────── */}
      <section className="mx-auto mt-6 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3">
        {PROMOS.map((b) => (
          <div key={b.name} className={`relative flex h-36 items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${b.cls} px-6 text-white shadow-card`}>
            <div>
              <h3 className="font-display text-xl font-extrabold leading-tight">{b.name.split(' & ')[0]}<br />{b.name.includes(' & ') ? `& ${b.name.split(' & ')[1]}` : b.name.split(' ').slice(1).join(' ')}</h3>
              <Link to={promoLink(b.name)} className="mt-3 inline-block rounded-full bg-white/90 px-4 py-1.5 text-xs font-bold text-slate-800 transition hover:bg-white">Shop Now</Link>
            </div>
            <span className="select-none text-6xl opacity-70">{b.emoji}</span>
          </div>
        ))}
      </section>

      {/* ── Animated Medicine Showcase ──────────────────── */}
      <motion.section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6" {...fadeInUp}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 shadow-pop">
          <div className="absolute inset-0 opacity-10">
            {[...Array(20)].map((_, i) => (
              <motion.div key={i} className="absolute h-2 w-2 rounded-full bg-white" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} animate={{ y: [0, -30, 0], opacity: [0.3, 1, 0.3] }} transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
            ))}
          </div>
          <div className="relative z-10">
            <h2 className="text-center font-display text-3xl font-extrabold text-white">Medicine Categories</h2>
            <p className="mt-2 text-center text-purple-200">Explore our wide range of pharmaceutical products</p>
            <div className="mt-8 grid grid-cols-3 gap-6 md:grid-cols-6">
              {MEDICINE_ANIMATIONS.map((med, i) => (
                <motion.div key={med.type} className="flex flex-col items-center gap-3" initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                  <motion.div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm md:h-24 md:w-24" animate={med.animation} whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.5 }}>
                    <span className="text-4xl md:text-5xl">{med.icon}</span>
                  </motion.div>
                  <span className="text-sm font-bold text-white">{med.type}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Shop by Category ───────────────────────────── */}
      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl font-extrabold">Shop by Category</h2>
          <Link to="/categories" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
        </div>
        {!cats ? <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-8">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-32" />)}</div>
          : cats.length ? (
            <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-8 lg:overflow-visible">
              {cats.slice(0, 8).map((c) => (
                <Link key={c._id} to={`/products?category=${encodeURIComponent(c.slug || c._id)}`}
                  className="card group flex min-w-[130px] flex-col items-center justify-center gap-2 px-3 py-6 text-center transition hover:-translate-y-1 hover:shadow-pop">
                  <span className="text-4xl transition group-hover:scale-110">{catIcon(c.name)}</span>
                  <span className="text-xs font-bold leading-tight text-slate-700 group-hover:text-blue-700">{c.name}</span>
                </Link>
              ))}
            </div>
          ) : <EmptyState title="No categories yet" hint="Categories are managed by the pharmacy administrator." />}
      </section>

      {/* ── Pharmacy Timeline ──────────────────────────── */}
      <motion.section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <motion.div className="text-center" {...fadeInUp}>
          <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-sm font-bold text-purple-700">Our Journey</span>
          <h2 className="mt-3 font-display text-3xl font-extrabold md:text-4xl">Lalitha Pharmacy Timeline</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">From a small pharmacy to Indias trusted online medicine platform</p>
        </motion.div>
        <div className="relative mt-12">
          <div className="absolute left-8 block h-full w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 md:left-1/2 md:hidden" />
          <div className="absolute left-1/2 hidden h-full w-1 -translate-x-1/2 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 md:block" />
          {TIMELINE.map((item, i) => (
            <motion.div key={item.year} className={`relative mb-8 flex items-center ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`} initial={{ opacity: 0, x: i % 2 === 0 ? -100 : 100 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }}>
              <div className={`ml-20 md:ml-0 ${i % 2 === 0 ? 'md:w-1/2 md:pr-12 md:text-right' : 'md:w-1/2 md:pl-12'}`}>
                <motion.div className="card p-6 shadow-card" whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                  <div className={`flex items-center gap-3 ${i % 2 === 0 ? 'md:justify-end' : ''}`}>
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold text-white ${item.color}`}>{item.year}</span>
                      <h3 className="mt-1 font-display text-xl font-extrabold">{item.title}</h3>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </motion.div>
              </div>
              <div className="absolute left-8 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg md:left-1/2">
                <motion.div className={`h-4 w-4 rounded-full ${item.color}`} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Advanced Features ───────────────────────────── */}
      <motion.section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <motion.div className="text-center" {...fadeInUp}>
          <span className="inline-block rounded-full bg-cyan-100 px-4 py-1 text-sm font-bold text-cyan-700">New Features</span>
          <h2 className="mt-3 font-display text-3xl font-extrabold md:text-4xl">Advanced Features</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Cutting-edge technology for your healthcare needs</p>
        </motion.div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ADVANCED_FEATURES.map((feat, i) => (
            <motion.div key={feat.title} className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-card" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} whileHover={{ y: -10, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
              <motion.div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${feat.color} opacity-10`} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 3, repeat: Infinity }} />
              <motion.div className="mb-4 text-5xl" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}>{feat.icon}</motion.div>
              <h3 className="font-display text-xl font-extrabold">{feat.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feat.desc}</p>
              <motion.div className={`mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${feat.color} px-4 py-2 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100`} whileHover={{ scale: 1.05 }}>Learn More</motion.div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Featured Products ──────────────────────────── */}
      <section className="mx-auto mt-10 max-w-7xl px-4 pb-14 sm:px-6">
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <h2 className="font-display text-2xl font-extrabold">Featured Products</h2>
          <div className="flex flex-wrap gap-2">
            {[['best', 'Best Sellers'], ['new', 'New Arrivals'], ['offers', 'Offers']].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${tab === k ? 'bg-blue-600 text-white shadow-pop' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          {!featured ? <SkeletonGrid />
            : visible.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visible.slice(0, 8).map((p) => <ProductCard key={p._id} p={p} />)}</div>
            ) : <EmptyState title={tab === 'offers' ? 'No offers right now' : 'No products available yet'} hint={tab === 'offers' ? 'Products with discounts appear here automatically.' : 'New arrivals appear here automatically once the pharmacy adds stock.'} />}
        </div>
      </section>
    </div>
  );
}
