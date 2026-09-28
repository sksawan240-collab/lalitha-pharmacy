export function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">About Lalitha Pharmacy</h1>
      <p className="mt-3 leading-relaxed text-slate-600">Lalitha Pharmacy is a pharmaceutical distribution platform connecting verified stock with clinics, pharmacies and healthcare providers. Every product, batch, price and quantity on this website is served live from our database — nothing is demo content.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[['✔ Verified stock', 'Batch numbers, manufacturing and expiry dates on every product.'], ['✔ Transparent billing', 'GST-split, PDF invoices emailed on every order.'], ['✔ Real-time ops', 'Low-stock and expiry alerts keep supply safe.']].map(([t, d]) => (
          <div key={t} className="card p-5"><h3 className="font-display font-bold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>
        ))}
      </div>
    </div>
  );
}

export function Services() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Services</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[['Wholesale distribution', 'Tablets, capsules, syrups, injections, surgical supplies and devices at distributor pricing.'], ['Prescription handling', 'Secure upload with pharmacist verification before dispatch of Rx products.'], ['Order & invoice management', 'Live tracking timelines plus downloadable, emailable GST invoices.'], ['Stock safety', 'Expiry blocking, low-stock alerts and batch traceability.']].map(([t, d]) => (
          <div key={t} className="card p-5"><h3 className="font-display font-bold">{t}</h3><p className="mt-1 text-sm text-slate-500">{d}</p></div>
        ))}
      </div>
    </div>
  );
}

export function Contact() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Contact Lalitha Pharmacy</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><h3 className="font-bold">📧 Email</h3><p className="text-sm text-slate-500">support@lalithapharmacy.com</p></div>
        <div className="card p-5"><h3 className="font-bold">📞 Phone</h3><p className="text-sm text-slate-500">+91-XXXXXXXXXX (Mon–Sat, 9am–7pm)</p></div>
        <div className="card p-5"><h3 className="font-bold">📍 Address</h3><p className="text-sm text-slate-500">Update in footer env — your registered pharmacy address.</p></div>
      </div>
      <div className="card mt-4 p-5 text-sm text-slate-500">Prefer chat? Use the floating AI assistant on any page for product discovery, order help and FAQs.</div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-7xl">⚕</p>
      <h1 className="font-display mt-4 text-3xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you requested does not exist.</p>
      <a href="/" className="btn-primary mt-6">Back to home</a>
    </div>
  );
}
