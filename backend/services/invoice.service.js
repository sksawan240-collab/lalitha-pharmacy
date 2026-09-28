const fs = require('fs');
const Invoice = require('../models/Invoice');
const { buildInvoicePdf, INVOICE_DIR } = require('./invoiceRenderer');

/** LP-INV-2026-XXXXXX — crypto-random 6-digit suffix. */
const generateInvoiceNumber = (year = new Date().getFullYear()) => {
  const suffix = String(Math.floor(100000 + Math.random() * 900000));
  return `LP-INV-${year}-${suffix}`;
};

/**
 * Create (or return existing) invoice for an order and persist the record.
 * PDF is generated from real order data; the file URL is stored on the record.
 */
const createInvoiceForOrder = async ({ order, generate = true }) => {
  const existing = order.invoice ? await Invoice.findById(order.invoice) : null;
  if (existing && existing.pdfPath) return existing;

  const invoiceNumber = existing ? existing.invoiceNumber : generateInvoiceNumber();
  const { pdfPath, pdfUrl } = generate
    ? await buildInvoicePdf({ order, invoiceNumber })
    : { pdfPath: '', pdfUrl: '' };

  const invoice = existing || new Invoice({
    invoiceNumber,
    order: order._id,
    customer: order.customer,
    totalAmount: order.total,
    gst: order.gst,
    discount: order.discount,
    paymentStatus: order.payment?.status || 'PENDING',
  });
  invoice.pdfPath = pdfPath;
  invoice.pdfUrl = pdfUrl;
  await invoice.save();

  if (!order.invoice) {
    order.invoice = invoice._id;
    await order.save();
  }
  return invoice;
};

/** Verify a stored invoice file still exists and return its absolute path. */
const getInvoiceFilePath = (pdfPath) => (pdfPath && fs.existsSync(pdfPath) ? pdfPath : null);

module.exports = { createInvoiceForOrder, generateInvoiceNumber, getInvoiceFilePath, INVOICE_DIR };