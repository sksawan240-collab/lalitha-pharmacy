import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { Logo } from '../components/ui';
import { ThemeToggle } from '../components/ui';
import Chatbot from '../components/Chatbot';
import { useState } from 'react';

export function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  if (loading) return <div className="grid min-h-screen place-items-center"><div className="skeleton h-16 w-64" /></div>;
  if (!user) { nav('/login'); return null; }
  if (roles && !roles.includes(user.role)) { nav('/'); return null; }
  return children;
}

function Shell({ title, links }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const out = async () => { await logout(); nav('/login'); };
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 -translate-x-full bg-gradient-to-b from-ink-900 via-med-900 to-pharm-900 text-white transition-transform lg:static lg:translate-x-0 ${open ? '!translate-x-0' : ''}`}>
        <div className="flex h-full flex-col p-4">
          <Link to="/" className="rounded-xl bg-white/10 p-2 backdrop-blur"><Logo /></Link>
          <p className="mt-3 px-2 text-[11px] font-bold uppercase tracking-widest text-white/60">{title}</p>
          <nav className="mt-2 flex-1 space-y-1 overflow-y-auto">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <span>{l.icon}</span>{l.label}
              </NavLink>
            ))}
          </nav>
          <div className="rounded-xl bg-white/10 p-3 text-sm">
            <p className="font-bold">{user?.name}</p>
            <p className="text-xs text-white/60">{user?.email}</p>
            <button onClick={out} className="mt-2 w-full rounded-lg bg-white/15 py-1.5 font-semibold hover:bg-white/25">Logout</button>
          </div>
        </div>
      </aside>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
      <div className="flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl">
          <button onClick={() => setOpen(!open)} className="lg:hidden rounded-lg border px-3 py-1.5">☰</button>
          <h1 className="font-display font-bold">{title}</h1>
          <ThemeToggle />
          <Link to="/" className="ml-auto text-sm font-semibold text-med-600">← Storefront</Link>
        </div>
        <div className="p-4 sm:p-6"><Outlet /></div>
      </div>
      <Chatbot />
    </div>
  );
}

export const CUSTOMER_LINKS = [
  { to: '/app', end: true, label: 'Dashboard', icon: '📊' },
  { to: '/app/products', label: 'Products', icon: '💊' },
  { to: '/app/cart', label: 'Cart', icon: '🛒' },
  { to: '/app/orders', label: 'My Orders', icon: '📦' },
  { to: '/app/invoices', label: 'Invoices', icon: '🧾' },
  { to: '/app/wishlist', label: 'Wishlist', icon: '❤' },
  { to: '/app/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/app/profile', label: 'Profile', icon: '👤' },
];

export const ADMIN_LINKS = [
  { to: '/admin', end: true, label: 'Dashboard', icon: '📊' },
  { to: '/admin/products', label: 'Products', icon: '💊' },
  { to: '/admin/categories', label: 'Categories', icon: '🗂' },
  { to: '/admin/inventory', label: 'Inventory', icon: '📦' },
  { to: '/admin/orders', label: 'Orders', icon: '🧾' },
  { to: '/admin/customers', label: 'Customers', icon: '👥' },
  { to: '/admin/staff', label: 'Sales Operators', icon: '🧑‍💼' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { to: '/admin/announcements', label: 'Announcements', icon: '📢' },
  { to: '/admin/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/admin/audit', label: 'Audit Logs', icon: '🛡' },
];

export const SALES_LINKS = [
  { to: '/sales', end: true, label: 'Dashboard', icon: '📊' },
  { to: '/sales/orders', label: 'Orders', icon: '📦' },
  { to: '/sales/customers', label: 'Customers', icon: '👥' },
  { to: '/sales/products', label: 'Products', icon: '💊' },
  { to: '/sales/inventory', label: 'Inventory', icon: '📦' },
  { to: '/sales/notifications', label: 'Notifications', icon: '🔔' },
];

export const SALES_MANAGER_LINKS = [
  { to: '/sales-manager', end: true, label: 'Dashboard', icon: '📊' },
  { to: '/sales-manager/orders', label: 'Orders', icon: '📦' },
  { to: '/sales-manager/customers', label: 'Customers', icon: '👥' },
  { to: '/sales-manager/products', label: 'Products', icon: '💊' },
  { to: '/sales-manager/inventory', label: 'Inventory', icon: '📦' },
  { to: '/sales-manager/notifications', label: 'Notifications', icon: '🔔' },
];

export const CustomerShell = () => <Shell title="Customer" links={CUSTOMER_LINKS} />;
export const AdminShell = () => <Shell title="Admin" links={ADMIN_LINKS} />;
export const SalesShell = () => <Shell title="Sales Operator" links={SALES_LINKS} />;
export const SalesManagerShell = () => <Shell title="Sales Manager" links={SALES_MANAGER_LINKS} />;
