import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { cartApi, orderApi, prescriptionApi } from '../../services/endpoints';
import { EmptyState, Field } from '../../components/ui';
import { money } from '../../utils/format';
import { apiError } from '../../services/api';
import toast from 'react-hot-toast';

export function Checkout() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const [cart, setCart] = useState(null);
  const [rxFiles, setRxFiles] = useState({});
  const nav = useNavigate();
  useEffect(() => { cartApi.get().then((r) => setCart(r.data.cart)).catch(() => setCart({ items: [] })); }, []);
  const needsRx = cart?.items?.some((i) => i.product?.prescriptionRequired);

  const on = async (v) => {
    try {
      const items = [];
      for (const i of cart.items || []) {
        let prescriptionId;
        if (i.prescriptionRequired) {
          const f = rxFiles[i.productId];
          if (!f) { toast.error(`Prescription required for ${i.name}`); return; }
          const fd = new FormData();
          fd.append('file', f); fd.append('productId', i.productId);
          const up = await prescriptionApi.upload(fd);
          prescriptionId = up.data.prescription._id;
        }
        items.push({ productId: i.productId, quantity: i.quantity, prescriptionId });
      }
      const res = await orderApi.create({ items, address: { addressLine1: v.line, city: v.city, state: v.state, pincode: v.pincode }, paymentMethod: v.paymentMethod === 'ONLINE' ? 'ONLINE' : 'CASH_ON_DELIVERY', notes: v.notes });
      window.__lpRefreshCart?.();
      toast.success(`Order ${res.data.order.orderId} placed! Invoice emailed.`);
      nav(`/app/orders/${res.data.order._id}`);
    } catch (e) { toast.error(apiError(e, 'Checkout failed')); }
  };

  if (!cart) return <div className="skeleton h-40" />;
  if (!cart.items?.length) return <EmptyState title="Nothing to check out" hint="Your cart is empty." action={<Link to="/products" className="btn-primary text-sm">Browse products</Link>} />;
  return (
    <form onSubmit={handleSubmit(on)} className="grid gap-5 lg:grid-cols-3">
      <div className="card space-y-3 p-5 lg:col-span-2">
        <h3 className="font-display font-bold">Delivery address</h3>
        <Field label="Address line"><input className="input" {...register('line', { required: true })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City"><input className="input" {...register('city', { required: true })} /></Field>
          <Field label="State"><input className="input" {...register('state', { required: true })} /></Field>
          <Field label="Pincode"><input className="input" {...register('pincode', { required: true })} /></Field>
        </div>
        <Field label="Payment"><select className="input" {...register('paymentMethod')}><option value="COD">Cash on Delivery</option><option value="ONLINE">Online</option></select></Field>
        {needsRx && (
          <div className="rounded-xl bg-amber-50 p-4">
            <h4 className="font-bold text-amber-800">Prescription upload required</h4>
            {cart.items.filter((i) => i.product?.prescriptionRequired).map((i) => (
              <div key={i.product._id} className="mt-2 text-sm"><p className="font-semibold">{i.product.name}</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setRxFiles({ ...rxFiles, [i.product._id]: e.target.files[0] })} className="mt-1 text-xs" /></div>
            ))}
          </div>
        )}
      </div>
      <div className="card h-fit p-5">
        <h3 className="font-display font-bold">Order total</h3>
        <p className="mt-2 text-sm">Subtotal <b className="float-right">{money(cart.subtotal)}</b></p>
        <p className="text-sm">GST <b className="float-right">{money(cart.gstTotal)}</b></p>
        <p className="font-display mt-2 text-xl font-extrabold">Total {money(cart.total)}</p>
        <button disabled={isSubmitting} className="btn-primary mt-4 w-full">{isSubmitting ? 'Placing…' : 'Place order'}</button>
      </div>
    </form>
  );
}
