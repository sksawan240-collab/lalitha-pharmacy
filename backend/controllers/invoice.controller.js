const fs = require('fs');
const InvoiceModel = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const invoiceService = require('../services/invoice.service');
const emailService = require('../services/email.service');
const audit = require('../services/audit.service');

/** GET /api/invoices/mine — customer's invoices (join collection). */
const myInvoices = asyncHandler(async (req, res) => {
  const invoices = await InvoiceModel.find({ customer: req.user._id })
    .populate('order', 'orderId status createdAt total')
    .sort({ createdAt: -1 })
    .limit(100);
  ok(res, { data: { invoices } });
});

/** GET /api/invoices/:id/file — download/view the actual PDF. */
const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceModel.findById(req.params.id).populate('customer', '_id');
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const isOwner = invoice.customer && invoice.customer._id.toString() === req.user._id.toString();
  const staff = ['ADMIN', 'SALES_OPERATOR'].includes(req.user.role);
  if (!isOwner && !staff) throw ApiError.forbidden('You cannot download this invoice');

  // Regenerate PDF if file is missing (e.g. after server migration or corrupted generation)
  let filePath = invoiceService.getInvoiceFilePath(invoice.pdfPath);
  if (!filePath) {
    const Order = require('../models/Order');
    const order = await Order.findById(invoice.order).populate('customer', 'name email mobile');
    if (order) {
      const { buildInvoicePdf } = require('../services/invoiceRenderer');
      const result = await buildInvoicePdf({ order, invoiceNumber: invoice.invoiceNumber });
      invoice.pdfPath = result.pdfPath;
      invoice.pdfUrl = result.pdfUrl;
      await invoice.save();
      filePath = result.pdfPath;
    }
  }
  if (!filePath) throw ApiError.notFound('Invoice PDF could not be generated');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
  res.sendFile(filePath);
});

/** POST /api/invoices/:id/email — resend invoice email (owner). */
const emailInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceModel.findById(req.params.id).populate('customer', 'name email').populate('order', 'orderId total');
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.customer._id.toString() !== req.user._id.toString() && !['ADMIN', 'SALES_OPERATOR'].includes(req.user.role)) {
    throw ApiError.forbidden('You cannot email this invoice');
  }

  await emailService.sendInvoiceEmail({
    to: invoice.customer.email,
    name: invoice.customer.name,
    orderId: invoice.order?.orderId,
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.totalAmount,
    pdfPath: invoiceService.getInvoiceFilePath(invoice.pdfPath),
  });
  invoice.emailedAt = new Date();
  await invoice.save();
  await audit({ user: req.user, action: 'INVOICE_EMAILED', resource: 'Invoice', resourceId: invoice._id, req });
  ok(res, { message: 'Invoice sent to your email address' });
});

/** GET /api/admin/invoices — full invoice list incl. order info. */
const adminInvoices = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '15', 10));
  const q = (req.query.q || '').trim();

  const query = {};
  if (q) {
    query.$or = [{ invoiceNumber: { $regex: q, $options: 'i' } }, { 'order': null }];
  }
  const total = await InvoiceModel.countDocuments(query);
  const invoices = await InvoiceModel.find(query)
    .populate('order', 'orderId status')
    .populate('customer', 'name email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  ok(res, { data: { invoices, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

module.exports = { myInvoices, downloadInvoice, emailInvoice, adminInvoices };