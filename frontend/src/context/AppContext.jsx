import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { authApi } from '../services/endpoints';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('lp_theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('lp_theme', theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}

/**
 * SESSION AUTH (no JWT / tokens / localStorage auth).
 *
 * - Login creates a server-side session (HTTP-only cookie `lp.sid`).
 * - REQUIRED BEHAVIOUR: refreshing/reloading the page destroys the
 *   server-side session via POST /api/auth/logout and redirects to /login.
 *   Detection uses the Navigation Timing API: on mount, if this load was a
 *   `reload`, we immediately call logout. `sessionStorage` holds only a
 *   transient tab-alive flag (no credentials) to distinguish a true reload
 *   from other mounts — the actual session kill is always server-side.
 */
const TAB_FLAG = 'lp_tab_alive';

const wasReload = () => {
  try {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    if (nav?.type) return nav.type === 'reload';
  } catch { /* ignore */ }
  try {
    // Deprecated fallback for older browsers.
    // eslint-disable-next-line no-undef
    if (typeof performance !== 'undefined' && performance.navigation) {
      return performance.navigation.type === 1;
    }
  } catch { /* ignore */ }
  return false;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);
  userRef.current = user;

  const hardLogout = useCallback(async ({ redirect = true } = {}) => {
    // Best-effort server-side session destroy — NEVER only React state.
    try { await authApi.logout(); } catch { /* already logged out / no session */ }
    try { sessionStorage.removeItem(TAB_FLAG); } catch { /* ignore */ }
    setUser(null);
    if (redirect && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  // Initial mount: reload → destroy server session + go to /login.
  // Otherwise try to restore the session user from the cookie (GET /auth/me).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reload = wasReload();
      // Mark this tab alive AFTER reading the navigation type (transient flag only).
      try { sessionStorage.setItem(TAB_FLAG, '1'); } catch { /* ignore */ }
      if (reload) {
        await hardLogout({ redirect: false });
        if (!cancelled) {
          setLoading(false);
          if (window.location.pathname !== '/login') window.location.assign('/login');
        }
        return;
      }
      try {
        const res = await authApi.me();
        if (!cancelled) setUser(res.data.user);
      } catch {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [hardLogout]);

  // Also destroy the server session when the tab is refreshed/closed.
  // sendBeacon keeps the logout best-effort even during unload.
  useEffect(() => {
    const onUnload = () => {
      if (!userRef.current) return;
      try {
        const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
        const blob = new Blob(['{}'], { type: 'application/json' });
        if (navigator.sendBeacon) navigator.sendBeacon(`${base}/auth/logout`, blob);
      } catch { /* ignore */ }
      try { sessionStorage.removeItem(TAB_FLAG); } catch { /* ignore */ }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, []);

  useEffect(() => {
    const h = () => { setUser(null); };
    window.addEventListener('lp:session-expired', h);
    return () => window.removeEventListener('lp:session-expired', h);
  }, []);

  const login = async (payload) => {
    const res = await authApi.login(payload);
    setUser(res.data.user);
    try { sessionStorage.setItem(TAB_FLAG, '1'); } catch { /* ignore */ }
    return res;
  };
  const logout = async () => {
    await hardLogout({ redirect: false });
  };
  const load = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data.user);
    } catch { setUser(null); }
    setLoading(false);
  }, []);
  const value = useMemo(() => ({ user, loading, login, logout, setUser, refresh: load, api }), [user, loading, load]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

/** Catches in-app navigations to auth pages after a server-side logout. */
export function SessionGuard({ children }) {
  const nav = useNavigate();
  useEffect(() => {
    const h = () => nav('/login', { replace: true });
    window.addEventListener('lp:session-expired', h);
    return () => window.removeEventListener('lp:session-expired', h);
  }, [nav]);
  return children;
}

const SockCtx = createContext(null);
export const useSocket = () => useContext(SockCtx);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!user) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      return undefined;
    }
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    // Cookie-authenticated: the session cookie is sent automatically (no tokens).
    const s = io(url, { withCredentials: true, transports: ['websocket', 'polling'] });
    setSocket(s);
    const push = (type, payload) => setEvents((e) => [{ id: Date.now() + Math.random(), type, payload, at: new Date() }, ...e].slice(0, 30));
    ['order:created', 'order:updated', 'product:created', 'product:updated', 'inventory:updated', 'alert:low-stock', 'alert:expiry', 'announcement:new', 'notification:new'].forEach((ev) =>
      s.on(ev, (p) => push(ev, p))
    );
    return () => s.disconnect();
  }, [user?._id]);

  return <SockCtx.Provider value={{ socket, events }}>{children}</SockCtx.Provider>;
}
