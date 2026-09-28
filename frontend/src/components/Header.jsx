import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AppContext';
import { Logo, roleHome, ThemeToggle } from './ui';

const links = [
  { to: '/', label: 'Home' }, { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' }, { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' }, { to: '/contact', label: 'Contact' },
];

export default function Header({ cartCount = 0, onCart }) {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    h(); window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const out = async () => { await logout(); nav('/login'); };
  const search = (e) => { e.preventDefault(); nav(`/products?q=${encodeURIComponent(term)}`); };

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all ${scrolled ? 'bg-white/85 shadow-card backdrop-blur-xl' : 'bg-white/70 backdrop-blur-sm'}`}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/"><Logo /></Link>
        <form onSubmit={search} className="hidden min-w-0 flex-1 items-center md:flex">
          <div className="flex w-full max-w-xl overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm focus-within:border-med-500">
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search for medicines, healthcare products..."
              className="min-w-0 flex-1 px-5 py-2.5 text-sm outline-none" />
            <button className="m-1 grid h-9 w-14 place-items-center rounded-full bg-med-600 text-white transition hover:bg-med-700" aria-label="Search">🔍</button>
          </div>
        </form>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={onCart} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70" aria-label="Cart">
            🛒
            {cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pharm-600 px-1 text-[11px] font-bold text-white">{cartCount}</span>}
          </button>
          {!user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost !px-4 !py-2 text-sm">Login</Link>
              <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">Register</Link>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to={roleHome(user.role)} className="btn-ghost !px-4 !py-2 text-sm">Dashboard</Link>
              <Link to="/app/profile" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-med-600 to-pharm-600 font-bold text-white">{user.name?.[0]?.toUpperCase()}</Link>
              <button onClick={out} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:text-rose-600">Logout</button>
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 lg:hidden" aria-label="Menu">☰</button>
        </div>
      </div>
      {/* Category nav strip */}
      <nav className="hidden border-t border-slate-200/60 bg-white/80 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-4 sm:px-6">
          <Link to="/categories" className="mr-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-1.5 text-sm font-bold text-white shadow-pop transition hover:bg-blue-700">☰ All Categories</Link>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) => `relative rounded-lg px-3.5 py-2 text-sm font-semibold transition ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
              {({ isActive }) => (<>
                {l.label}
                {isActive && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-[5px] h-[3px] rounded-full bg-blue-600" />}
              </>)}
            </NavLink>
          ))}
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-slate-200/60 bg-white/90 backdrop-blur-xl lg:hidden">
            <div className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between px-3 py-1"><span className="text-xs font-bold uppercase tracking-widest text-slate-400">Theme</span><ThemeToggle /></div>
              {links.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-med-50">{l.label}</NavLink>)}
              {!user ? (
                <div className="flex gap-2 pt-2"><Link to="/login" onClick={() => setOpen(false)} className="btn-ghost flex-1">Login</Link><Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">Register</Link></div>
              ) : (
                <div className="flex gap-2 pt-2"><Link to={roleHome(user.role)} onClick={() => setOpen(false)} className="btn-primary flex-1">Dashboard</Link><button onClick={out} className="btn-ghost flex-1">Logout</button></div>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
