import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Chatbot from '../components/Chatbot';
import { cartApi } from '../services/endpoints';
import { useAuth, useSocket } from '../context/AppContext';
import toast from 'react-hot-toast';

export default function PublicLayout() {
  const { user } = useAuth();
  const { events } = useSocket();
  const [cartCount, setCartCount] = useState(0);
  const nav = useNavigate();

  const refreshCart = async () => {
    if (!user) { setCartCount(0); return; }
    try { const r = await cartApi.get(); setCartCount(r.data.cart?.items?.reduce((a, i) => a + i.quantity, 0) || 0); } catch { /* noop */ }
  };
  useEffect(() => { refreshCart(); }, [user?.id]);
  useEffect(() => {
    const last = events[0];
    if (!last) return;
    if (last.type === 'announcement:new') toast(`📢 ${last.payload?.title || 'New announcement'}`, { duration: 5000 });
    if (last.type?.startsWith('product:')) refreshCart();
  }, [events]);

  window.__lpRefreshCart = refreshCart;

  return (
    <div className="min-h-screen">
      <Header cartCount={cartCount} onCart={() => nav(user ? '/app/cart' : '/login')} />
      <main className="pt-[120px]"><Outlet context={{ refreshCart }} /></main>
      <Footer />
      <Chatbot />
    </div>
  );
}
