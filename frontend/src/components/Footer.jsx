import { Link } from 'react-router-dom';
import { Logo } from './ui';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div><Logo /><p className="mt-4 text-sm text-slate-500">Reliable pharmaceutical distribution & healthcare supply — genuine products, verified inventory, transparent pricing.</p></div>
        <div>
          <h4 className="font-display font-bold">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link to="/products" className="hover:text-med-600">All products</Link></li>
            <li><Link to="/categories" className="hover:text-med-600">Categories</Link></li>
            <li><Link to="/app/cart" className="hover:text-med-600">Cart</Link></li>
            <li><Link to="/app/orders" className="hover:text-med-600">Track order</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link to="/about" className="hover:text-med-600">About</Link></li>
            <li><Link to="/services" className="hover:text-med-600">Services</Link></li>
            <li><Link to="/contact" className="hover:text-med-600">Contact</Link></li>
            <li><Link to="/register" className="hover:text-med-600">Become a customer</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold">Support</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link to="/contact" className="hover:text-med-600">Help & contact</Link></li>
            <li><Link to="/login" className="hover:text-med-600">Login</Link></li>
            <li><Link to="/app" className="hover:text-med-600">Dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} Lalitha Pharmacy · All data served live from the database · No demo content</div>
    </footer>
  );
}
