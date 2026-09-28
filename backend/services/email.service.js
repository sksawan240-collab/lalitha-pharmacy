const nodemailer = require('nodemailer');
const env = require('../config/env');
const templates = require('./emailTemplates');

let transporter = null;
if (env.emailConfigured) {
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure,
    auth: { user: env.email.user, pass: env.email.password },
  });
}

const sendMail = async ({ to, subject, html, attachments = [] }) => {
  if (!transporter) {
    console.warn(`[mail] SMTP not configured — skipping "${subject}" to ${to}`);
    return { skipped: true, reason: 'SMTP_NOT_CONFIGURED' };
  }
  const info = await transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
    attachments,
  });
  console.log(`[mail] sent "${subject}" → ${to} (${info.messageId || 'ok'})`);
  return { skipped: false, messageId: info.messageId };
};

/** Guard so rating-limited flows don't fire duplicate emails in edge cases. */
const mailAvailable = () => Boolean(transporter);

module.exports = {
  mailAvailable,
  sendMail,
  sendOtpEmail: (to, code, purpose) =>
    transporter
      ? sendMail({ to, subject: 'Lalitha Pharmacy — Your verification code', html: templates.otpEmail({ name: to, code, purpose }) })
      : Promise.resolve({ skipped: true }),
  sendWelcomeEmail: (to, name) =>
    sendMail({ to, subject: 'Welcome to Lalitha Pharmacy 🎉', html: templates.welcomeEmail({ name }) }),
  sendOrderStatusEmail: ({ to, name, orderId, status, items, total, message }) =>
    sendMail({
      to,
      subject: `Lalitha Pharmacy — Order ${orderId} ${status.replace(/_/g, ' ')}`,
      html: templates.orderStatusEmail({ name, orderId, status, items, total, message }),
    }),
  sendInvoiceEmail: ({ to, name, orderId, invoiceNumber, total, pdfPath }) =>
    sendMail({
      to,
      subject: `Your invoice ${invoiceNumber} from Lalitha Pharmacy`,
      html: templates.invoiceEmail({ name, orderId, invoiceNumber, total }),
      attachments: pdfPath ? [{ path: pdfPath, filename: `${invoiceNumber}.pdf` }] : [],
    }),
  sendLowStockEmail: (to, payload) =>
    sendMail({ to, subject: 'Low stock alert — Lalitha Pharmacy', html: templates.lowStockEmail(payload) }),
  sendExpiryAlertEmail: (to, payload) =>
    sendMail({ to, subject: 'Expiry alert — Lalitha Pharmacy', html: templates.expiryAlertEmail(payload) }),
  sendAnnouncementEmail: (to, payload) =>
    sendMail({ to, subject: payload.important ? 'Important: Lalitha Pharmacy announcement' : 'Lalitha Pharmacy update', html: templates.announcementEmail(payload) }),
  sendPasswordResetEmail: (to, name, resetLink) =>
    sendMail({ to, subject: 'Reset your Lalitha Pharmacy password', html: templates.passwordResetEmail({ name, resetLink }) }),
  sendOrderDeliveredThankYouEmail: ({ to, name, orderId, items, total, deliveredAt }) =>
    sendMail({
      to,
      subject: 'Thank You for Shopping with Lalitha Pharmacy! 🎉',
      html: templates.orderDeliveredThankYouEmail({ name, orderId, items, total, deliveredAt }),
    }),
};