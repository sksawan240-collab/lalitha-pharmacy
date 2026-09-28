# LALITHA PHARMACY — Real-time Pharmaceutical Distribution Platform

Production-ready full-stack app: React + Tailwind + Framer Motion frontend, Node/Express + MongoDB Atlas backend, Socket.IO real-time, Nodemailer email (OTP / welcome / order / invoice / alerts), PDFKit invoices, rule-based AI assistant backed by live DB data.

**Strict rule: NO MOCK DATA.** Empty database → professional empty states everywhere.

## Monorepo

```
lalitha-pharmacy/
  backend/    # Express API + Socket.IO + Mongo + email + PDF
  frontend/   # React SPA (Vite)
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (connection string)
- SMTP mailbox (Gmail App Password, SendGrid, SES, Mailtrap for dev…)

## 1 — Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then fill every value
```

Required `.env`:

| Var | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | signing keys (long random) |
| `EMAIL_HOST/PORT/SECURE/USER/PASS/FROM` | SMTP (empty = console-log fallback for dev) |
| `AI_API_KEY` / `AI_API_URL` / `AI_MODEL` | optional external LLM for chatbot (offline fallback uses live DB) |
| `FRONTEND_URL` | CORS + links inside emails |
| `ADMIN_EMAIL/PASSWORD/NAME` (+ optional MOBILE) | initial admin bootstrap via script |
| `RAZORPAY_KEY_ID/SECRET` | online payments (optional) |

Run:

```bash
npm run dev        # nodemon :5000
node scripts/createAdmin.js     # creates/promotes ADMIN_EMAIL admin
node scripts/seedCategories.js  # system categories (no products — those come from admin UI)
npm test           # supertest + mongodb-memory-server (auth, RBAC, products, cart, orders, stock)
```

## 2 — Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev      # :5173, proxies /api → :5000
npm run build    # production bundle
```

## 3 — User flows

- **Register → OTP → Welcome email → Login → shop → cart → checkout (+Rx upload) → order → emailed PDF invoice → live tracking → download invoice.**
- **Admin (`/admin`):** products CRUD (+image upload), inventory adjust, low-stock, expiry 30/60/90, orders (via shared pipeline), customers/staff, announcements (+email), audit logs, analytics from real aggregations.
- **Sales (`/sales`):** order verification + status pipeline (each step emails customer + emits socket), customer list, read-only products, low-stock view.
- **Real-time:** every product/order/inventory/announcement/notification event emits over Socket.IO; dashboards refresh + toasts without reload.

## 4 — Key API routes

`/api/auth /users /products /categories /cart /orders /prescriptions /invoices /notifications /announcements /admin /sales /chatbot /payments`

Auth: `Authorization: Bearer <access>` + `x-refresh-token` rotation on `/auth/refresh`. Invoice PDF download accepts `?token=` for direct links.

## 5 — Security

Helmet, CORS allowlist, rate limits (global + strict auth/OTP), express-mongo-sanitize, JWT access (15m) + rotating refresh tokens, bcrypt-12, RBAC middleware on every privileged route, PDF/image upload allowlists, no secrets in client bundle, consistent `{success,message,data}` responses.

## 6 — Production deploy

- Backend: Render/Railway/Fly/EC2 — set all env vars, `npm start`, expose `uploads/` persistently or move to S3.
- Frontend: Vercel/Netlify — `VITE_API_URL=https://<backend>/api`, `VITE_SOCKET_URL=https://<backend>`.
- Enable HTTPS, Atlas IP allowlist, SMTP with real domain + SPF/DKIM.

## 7 — Notes

- Expired products are blocked at cart + order layers (server-side).
- Rx products require an uploaded prescription; dispatch must wait for pharmacist approval (status on Prescription doc).
- AI assistant never invents products/prices/orders and always carries a non-doctor disclaimer.
