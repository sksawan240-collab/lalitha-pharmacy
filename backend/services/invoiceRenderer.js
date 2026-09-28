const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const env = require('../config/env');

const INVOICE_DIR = path.join(__dirname, '..', 'uploads', 'invoices');
const ensureDir = () => fs.mkdirSync(INVOICE_DIR, { recursive: true });

const money = (value) => `₹ ${Number(value || 0).toFixed(2)}`;
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const textAddr = (a) => {
  if (!a) return '—';
  return `${a.addressLine1}${a.addressLine2 ? ', ' + a.addressLine2 : ''}, ${a.city}, ${a.state} - ${a.pincode}${a.phone ? ' | Ph: ' + a.phone : ''}`;
};

/** Draw the items table header + rows. */
const drawItemsTable = (doc, order, startY) => {
  let y = startY;
  doc.rect(50, y, 495, 22).fill('#1e6bb8');
  doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
  doc.text('#', 55, y + 7);
  doc.text('Item', 85, y + 7);
  doc.text('Qty', 290, y + 7);
  doc.text('Rate', 330, y + 7);
  doc.text('GST%', 390, y + 7);
  doc.text('GST Amt', 435, y + 7);
  doc.text('Amount', 500, y + 7);
  y += 22;
  doc.fillColor('#333').fontSize(8).font('Helvetica');
  order.items.forEach((it, i) => {
    if (y > 720) { doc.addPage(); y = 50; }
    const bg = i % 2 === 0 ? '#f8fafc' : '#fff';
    doc.rect(50, y, 495, 20).fill(bg);
    doc.fillColor('#333');
    doc.text(String(i + 1), 55, y + 6);
    doc.text(it.name || '', 85, y + 6, { width: 200 });
    doc.text(String(it.quantity), 290, y + 6);
    doc.text(money(it.price), 330, y + 6);
    doc.text(`${it.gstPercent || 0}%`, 390, y + 6);
    doc.text(money(it.gstAmount), 435, y + 6);
    doc.text(money(it.subtotal), 500, y + 6);
    y += 20;
  });
  return y;
};

/** Draw the totals box. */
const drawTotals = (doc, order, y) => {
  const x = 320;
  const w = 225;
  doc.rect(x, y, w, 100).fill('#f0f7ff').stroke('#1e6bb8');
  doc.fillColor('#333').fontSize(9).font('Helvetica');
  doc.text('Subtotal', x + 20, y + 10);
  doc.text(money(order.subtotal), x + 155, y + 10, { align: 'right', width: 50 });
  doc.text('GST', x + 20, y + 28);
  doc.text(money(order.gst), x + 155, y + 28, { align: 'right', width: 50 });
  doc.text('Discount', x + 20, y + 46);
  doc.text(`- ${money(order.discount)}`, x + 155, y + 46, { align: 'right', width: 50 });
  doc.text('Delivery Fee', x + 20, y + 64);
  doc.text(money(order.deliveryFee), x + 155, y + 64, { align: 'right', width: 50 });
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('GRAND TOTAL', x + 20, y + 82);
  doc.text(money(order.total), x + 155, y + 82, { align: 'right', width: 50 });
};

/**
 * Render a professional invoice PDF using pdfkit's native drawing API.
 * No external dependencies (wkhtmltopdf) required.
 * Returns { invoiceNumber, pdfPath, pdfUrl }.
 */
const buildInvoicePdf = async ({ order, invoiceNumber }) => {
  ensureDir();
  const pdfPath = path.join(INVOICE_DIR, `${invoiceNumber}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    stream.on('finish', () => {
      const pdfUrl = `${env.backendUrl}/uploads/invoices/${encodeURIComponent(`${invoiceNumber}.pdf`)}`;
      resolve({ invoiceNumber, pdfPath, pdfUrl });
    });
    stream.on('error', reject);
    doc.pipe(stream);

    const customerName = order.customer?.name || order.customerName || 'Customer';
    const customerEmail = order.customer?.email || '';
    const customerMobile = order.customer?.mobile || '';
    const shipAddr = order.shippingAddress;
    const billAddr = order.billingAddress || order.shippingAddress;

    // Header
    doc.fillColor('#1e6bb8').fontSize(22).font('Helvetica-Bold').text('LALITHA PHARMACY', 50, 50);
    doc.fillColor('#5a7186').fontSize(9).font('Helvetica').text('Reliable Pharmaceutical Distribution & Healthcare Supply', 50, 78);
    doc.fontSize(8).text('GSTIN:29ASDPA8642F1ZT  |  DL: KP/2026/PH/00241', 50, 92);
    doc.text('14, Pharmacy Lane, Market Road, Bengaluru, Karnataka 560001');
    doc.text('Ph: +91 99004 87451 |  support@lalithapharmacy.com');

    // Invoice title + meta
    doc.fillColor('#1e6bb8').fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 380, 50, { align: 'right' });
    doc.fillColor('#333').fontSize(10).font('Helvetica-Bold').text(invoiceNumber, 380, 72, { align: 'right' });
    doc.fontSize(9).font('Helvetica').text(`Order: ${order.orderId}`, 380, 88, { align: 'right' });
    doc.text(`Date: ${fmt(order.createdAt)}`, 380, 102, { align: 'right' });

    // Divider
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#1e6bb8').lineWidth(2).stroke();

    // Bill to / Ship to
    let y = 135;
    doc.fillColor('#5a7186').fontSize(9).font('Helvetica-Bold').text('BILLED TO', 50, y);
    doc.fillColor('#333').fontSize(10).text(customerName, 50, y + 14);
    doc.fontSize(9).font('Helvetica').fillColor('#555').text(customerEmail, 50, y + 28);
    doc.text(customerMobile, 50, y + 40);
    doc.text(textAddr(billAddr), 50, y + 52, { width: 200 });

    doc.fillColor('#5a7186').fontSize(9).font('Helvetica-Bold').text('SHIPPED TO', 320, y);
    doc.fillColor('#333').fontSize(10).text(customerName, 320, y + 14);
    doc.fontSize(9).font('Helvetica').fillColor('#555').text(textAddr(shipAddr), 320, y + 28, { width: 200 });

    // Items table
    y = 230;
    y = drawItemsTable(doc, order, y);

    // Totals
    y += 10;
    drawTotals(doc, order, y);

    // Payment + order info
    y += 120;
    doc.fontSize(9).font('Helvetica').fillColor('#555');
    doc.text(`Payment Status: ${order.payment?.status || 'PENDING'}  |  Method: ${String(order.payment?.method || '').replace(/_/g, ' ')}  |  Order Status: ${String(order.status || '').replace(/_/g, ' ')}`, 50, y);

    // Terms
    y += 25;
    doc.fontSize(8).fillColor('#888');
    doc.text('Terms: Goods once sold are not returnable unless damaged or seal broken at delivery. Prescription-required items are dispatched only after verification.');
    doc.text('This is a computer-generated invoice and does not require a physical signature.');

    // Signature
    y += 35;
    doc.fillColor('#555').fontSize(9);
    doc.text('Authorised Signatory', 430, y, { align: 'right', width: 115 });
    doc.moveTo(430, y - 2).lineTo(545, y - 2).strokeColor('#ccc');

    doc.end();
  });
};

module.exports = { INVOICE_DIR, buildInvoicePdf, money, fmt };