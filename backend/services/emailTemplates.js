/**
 * Responsive HTML email templates, compatible with major email clients.
 * Inline CSS only — no external resources except the website link.
 */

const baseCss = `
  body { margin:0; padding:0; font-family:'Segoe UI',Arial,Helvetica,sans-serif; background:#eef6fb; }
  .wrap { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; border:1px solid #d8e8f2; }
  .head { background:linear-gradient(135deg,#0a5fa8 0%,#0ea5a0 100%); color:#ffffff; padding:26px 28px;
          border-radius:12px 12px 0 0; text-align:center; }
  .head h1 { margin:6px 0 0; font-size:22px; letter-spacing:.5px; }
  .head .cross { font-size:18px; }
  .body { padding:28px 32px; color:#22394f; font-size:15px; line-height:1.65; }
  .btn { display:inline-block; background:#0a7ab8; color:#ffffff; text-decoration:none;
         padding:12px 26px; border-radius:8px; font-weight:600; }
  .otp { display:block; width:70%; margin:18px auto; text-align:center; background:#f0f8ff;
         border:2px dashed #0a7ab8; border-radius:10px; padding:16px 0; font-size:30px;
         letter-spacing:8px; color:#0a4d7c; font-weight:700; }
  .table { width:100%; border-collapse:collapse; font-size:13px; }
  .table th { background:#eaf3fb; text-align:left; padding:8px 10px; }
  .table td { padding:8px 10px; border-top:1px solid #e2ecf5; }
  .foot { background:#f4f8fc; color:#5c7385; padding:18px 28px; font-size:12px; text-align:center;
          border-top:1px solid #dbe9f5; }
  .muted { color:#5c7385; font-size:13px; }
  .disclaimer { color:#8a9cad; font-size:11px; }
`;

const shell = ({ title, headline, cross = '✚', content }) => `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${baseCss}</style></head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="cross">${cross}</div>
      <h1>LALITHA PHARMACY</h1>
      <div style="font-size:12px;opacity:.85">Reliable Pharmaceutical Distribution &amp; Healthcare Supply</div>
    </div>
    <div class="body">
      <h2 style="color:#0a5fa8;margin-top:0">${headline}</h2>
      ${content}
      <p class="muted">Need help? Contact <a href="mailto:support@lalithapharmacy.com">support@lalithapharmacy.com</a>
      or visit our <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">website</a>.</p>
    </div>
    <div class="foot">
      LALITHA PHARMACY — Trusted pharmaceutical distribution.<br>
      This is an automated message. Please do not reply to this email.<br>
      <span class="disclaimer">If you did not request this email, you can safely ignore it. Always consult
      a qualified doctor or pharmacist for medical advice.</span>
    </div>
  </div>
</body></html>`;

const otpEmail = ({ name, code, purpose }) => {
  const purposeText = {
    REGISTER: 'verify your registration and activate your account',
    PASSWORD_RESET: 'reset your password',
    LOGIN: 'complete your secure login',
    CHANGE_EMAIL: 'confirm your new email address',
  }[purpose] || 'complete this security step';

  const content = `
    <p>Hello ${name},</p>
    <p>Use the secure code below to ${purposeText}. This code expires in 10 minutes.</p>
    <div class="otp">${code}</div>
    <p class="muted">Never share this code with anyone. Lalitha Pharmacy will never ask you for it.</p>`;
  return shell({ title: 'Your verification code', headline: 'Email Verification', content });
};

const welcomeEmail = ({ name }) => {
  const content = `
    <p>Dear ${name},</p>
    <p>Welcome to <strong>Lalitha Pharmacy</strong> — your partner in reliable pharmaceutical
    distribution and healthcare supply.</p>
    <p>Your account has been <strong>successfully verified</strong> and is now active. You can:</p>
    <ul>
      <li>Browse genuine medicines, devices and healthcare products</li>
      <li>Place orders with live stock updates</li>
      <li>Track your orders and download GST invoices</li>
      <li>Receive order, stock and announcement notifications</li>
    </ul>
    <p style="text-align:center;margin:20px 0">
      <a class="btn" href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login">Login to your account</a>
    </p>
    <p class="muted">Important: medicines requiring a prescription will need a valid prescription upload on checkout.</p>`;
  return shell({ title: 'Welcome to Lalitha Pharmacy', headline: 'Welcome aboard!', content });
};

const orderStatusEmail = ({ name, orderId, status, items, amount, total, message }) => {
  const rows = (items || [])
    .map(
      (it) =>
        `<tr><td>${it.name}</td><td>${it.quantity}</td><td>₹${Number(it.price).toFixed(2)}</td>
         <td>₹${Number(it.subtotal || it.price * it.quantity).toFixed(2)}</td></tr>`
    )
    .join('');
  const content = `
    <p>Dear ${name},</p>
    <p>${message}</p>
    <p style="margin:0">Status: <strong style="color:#0a7ab8">${String(status || '').replace(/_/g, ' ')}</strong></p>
    <p class="muted">Order ID: <strong>${orderId}</strong></p>
    <table class="table">
      <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${rows}
    </table>
    <p style="margin:14px 0 0;font-size:15px">Order Total: <strong>₹${Number(total || amount || 0).toFixed(2)}</strong></p>
    <p class="muted">Track progress from your dashboard any time. Prescription-required items are
    dispatched only after verification.</p>`;
  return shell({ title: `Update on order ${orderId}`, headline: `Order ${String(status || '').replace(/_/g, ' ')}`, content });
};

const invoiceEmail = ({ name, orderId, invoiceNumber, total }) => {
  const content = `
    <p>Dear ${name},</p>
    <p>Thank you for your order with <strong>Lalitha Pharmacy</strong>.</p>
    <p>Your GST invoice <strong>${invoiceNumber}</strong> for order <strong>${orderId}</strong>
    (total <strong>₹${Number(total).toFixed(2)}</strong>) is attached to this email as a PDF.</p>
    <p>You can also download it any time from your
    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/invoices">invoices page</a>.</p>`;
  return shell({ title: `Invoice ${invoiceNumber}`, headline: 'Your Invoice', content });
};

const lowStockEmail = ({ product, quantity, minimumStockLevel }) => {
  const content = `
    <p><strong>Low Stock Alert</strong></p>
    <p>Product <strong>${product}</strong> has only <strong>${quantity} units</strong> remaining
    (minimum stock level: ${minimumStockLevel}).</p>
    <p>Please review the item from the admin dashboard.</p>`;
  return shell({ title: 'Low stock alert', headline: 'Inventory Alert', content });
};

const expiryAlertEmail = ({ products, days }) => {
  const rows = (products || [])
    .map(
      (p) =>
        `<tr><td>${p.name}</td><td>${p.batchNumber || '—'}</td>
         <td>${new Date(p.expiryDate).toLocaleDateString('en-IN')}</td><td>${p.quantity}</td></tr>`
    )
    .join('');
  const content = `
    <p><strong>Medicine expiry alert</strong> — ${(products || []).length} product(s) expire within ${days} days.</p>
    <table class="table"><tr><th>Product</th><th>Batch</th><th>Expiry</th><th>Stock</th></tr>${rows}</table>
    <p class="muted">Expired items are blocked from sale automatically.</p>`;
  return shell({ title: 'Expiry alert', headline: 'Expiry Management', content });
};

const announcementEmail = ({ title, content, important }) => {
  const body = `
    <p style="${important ? 'color:#b42318;font-weight:700' : ''}"><strong>${title}</strong></p>
    <p>${String(content || '').replace(/\n/g, '<br>')}</p>`;
  return shell({
    title,
    headline: important ? 'Important Announcement' : 'Lalitha Pharmacy Update',
    content: body,
  });
};

const passwordResetEmail = ({ name, resetLink }) => {
  const content = `
    <p>Hello ${name},</p>
    <p>We received a request to reset your Lalitha Pharmacy password.</p>
    <p style="text-align:center;margin:20px 0">
      <a class="btn" href="${resetLink}">Reset my password</a>
    </p>
    <p class="muted">This link expires in 15 minutes. If you did not request a reset, you can safely ignore this email.</p>`;
  return shell({ title: 'Reset your password', headline: 'Password Reset', content });
};

const orderDeliveredThankYouEmail = ({ name, orderId, items, total, deliveredAt }) => {
  const deliveredDate = deliveredAt ? new Date(deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  
  const rows = (items || [])
    .map(
      (i) => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>₹${Number(i.price).toFixed(2)}</td><td>₹${Number(i.subtotal).toFixed(2)}</td></tr>`
    )
    .join('');

  const content = `
    <style>
      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.1); opacity: 1; }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes heartbeat {
        0%, 100% { transform: scale(1); }
        14% { transform: scale(1.3); }
        28% { transform: scale(1); }
        42% { transform: scale(1.3); }
        70% { transform: scale(1); }
      }
      @keyframes confettiFall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        100% { transform: translateY(40px) rotate(360deg); opacity: 0; }
      }
      @keyframes slideInUp {
        0% { transform: translateY(30px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px rgba(10, 122, 184, 0.3); }
        50% { box-shadow: 0 0 20px rgba(10, 122, 184, 0.6); }
      }
      @keyframes rainbow {
        0% { color: #e74c3c; }
        16% { color: #f39c12; }
        33% { color: #f1c40f; }
        50% { color: #2ecc71; }
        66% { color: #3498db; }
        83% { color: #9b59b6; }
        100% { color: #e74c3c; }
      }
      .anim-bounce { animation: bounceIn 0.8s ease-out; }
      .anim-float { animation: float 3s ease-in-out infinite; }
      .anim-pulse { animation: pulse 2s ease-in-out infinite; }
      .anim-heartbeat { animation: heartbeat 2s ease-in-out infinite; display: inline-block; }
      .anim-slideInUp { animation: slideInUp 0.6s ease-out; }
      .anim-glow { animation: glow 2s ease-in-out infinite; }
      .anim-rainbow { animation: rainbow 3s linear infinite; }
      .thankyou-text {
        font-size: 28px;
        font-weight: 800;
        text-align: center;
        background: linear-gradient(90deg, #0a7ab8, #0ea5a0, #0a7ab8);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
      }
      .confetti-container { text-align: center; padding: 10px 0; height: 40px; overflow: hidden; }
      .confetti { display: inline-block; font-size: 20px; margin: 0 5px; animation: confettiFall 2.5s ease-in-out infinite; }
      .confetti:nth-child(2) { animation-delay: 0.3s; }
      .confetti:nth-child(3) { animation-delay: 0.6s; }
      .confetti:nth-child(4) { animation-delay: 0.9s; }
      .confetti:nth-child(5) { animation-delay: 1.2s; }
    </style>

    <div class="confetti-container anim-bounce">
      <span class="confetti">🎉</span>
      <span class="confetti">🎊</span>
      <span class="confetti">✨</span>
      <span class="confetti">🎁</span>
      <span class="confetti">💊</span>
    </div>

    <div class="thankyou-text anim-slideInUp" style="margin: 15px 0;">
      Thank You for Shopping!
    </div>

    <div style="text-align: center; margin: 10px 0;">
      <span class="anim-heartbeat" style="font-size: 32px;">❤️</span>
    </div>

    <p style="text-align: center; font-size: 16px; color: #22394f;">
      Dear <strong>${name}</strong>,
    </p>

    <p style="text-align: center; font-size: 15px; color: #22394f;">
      Your order has been <strong style="color: #27ae60;">successfully delivered</strong>! 
      We hope you had a wonderful shopping experience with us.
    </p>

    <div class="anim-glow" style="background: #f8fbfd; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e2ecf5;">
      <p style="margin: 0 0 10px; text-align: center; font-size: 14px; color: #5c7385;">
        📦 Order ID: <strong style="color: #0a7ab8;">${orderId}</strong>
      </p>
      ${deliveredDate ? `<p style="margin: 0 0 10px; text-align: center; font-size: 14px; color: #5c7385;">📅 Delivered on: <strong>${deliveredDate}</strong></p>` : ''}
      <table class="table" style="margin-top: 12px;">
        <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>${rows}
      </table>
      <p style="margin: 15px 0 0; text-align: center; font-size: 18px; color: #0a5fa8;">
        Order Total: <strong>₹${Number(total).toFixed(2)}</strong>
      </p>
    </div>

    <div style="text-align: center; font-size: 24px; letter-spacing: 4px; padding: 8px 0;">
      <span style="display:inline-block; animation: float 3s ease-in-out infinite;">⭐</span>
      <span style="display:inline-block; animation: float 3s ease-in-out infinite 0.2s;">⭐</span>
      <span style="display:inline-block; animation: float 3s ease-in-out infinite 0.4s;">⭐</span>
      <span style="display:inline-block; animation: float 3s ease-in-out infinite 0.6s;">⭐</span>
      <span style="display:inline-block; animation: float 3s ease-in-out infinite 0.8s;">⭐</span>
    </div>
    <p style="text-align: center; font-size: 14px; color: #5c7385; margin-top: 5px;">
      We value your feedback! Rate us 5 stars 🌟
    </p>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn" style="border-radius: 50px; padding: 14px 32px; font-size: 16px; animation: pulse 2s ease-in-out infinite; display: inline-block;">
        🛒 Visit Us Again
      </a>
    </div>

    <p class="anim-rainbow" style="text-align: center; font-weight: 700; font-size: 16px; margin: 15px 0;">
      🏥 Your Health, Our Priority! 🏥
    </p>

    <p style="text-align: center; font-size: 14px; color: #5c7385; margin-top: 20px;">
      We look forward to serving you again. Stay healthy! 💚
    </p>

    <div style="text-align: center; margin: 15px 0;">
      <span class="anim-float" style="font-size: 40px;">🏥</span>
    </div>
  `;

  return shell({
    title: 'Order Delivered - Thank You!',
    headline: 'Order Delivered Successfully!',
    cross: '✅',
    content,
  });
};

module.exports = {
  shell,
  otpEmail,
  welcomeEmail,
  orderStatusEmail,
  invoiceEmail,
  lowStockEmail,
  expiryAlertEmail,
  announcementEmail,
  passwordResetEmail,
  orderDeliveredThankYouEmail,
};