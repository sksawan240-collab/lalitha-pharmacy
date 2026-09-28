import { useTheme } from '../context/AppContext';

export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle dark mode"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-lg transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:bg-slate-700 ${className}`}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

export function Logo({ size = 40 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-med-600 via-med-500 to-pharm-500 text-white shadow-pop" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="currentColor" aria-hidden>
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
        </svg>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-pharm-400 ring-2 ring-white" />
      </span>
      <span className="leading-tight">
        <span className="font-display block text-lg font-800 font-extrabold tracking-tight text-ink-900">LALITHA PHARMACY</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-pharm-600">Healthcare Supply</span>
      </span>
    </span>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-med-100 to-pharm-100">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-med-600" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" /></svg>
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonGrid({ n = 8 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton h-44 !rounded-none" />
          <div className="space-y-2 p-4"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-9 w-full" /></div>
        </div>
      ))}
    </div>
  );
}

export const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}
  </label>
);

export const roleHome = (role) => (role === 'ADMIN' ? '/admin' : role === 'SALES_OPERATOR' ? '/sales' : role === 'SALES_MANAGER' ? '/sales-manager' : '/app');
