const Prescription = require('../models/Prescription');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const audit = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const realtime = require('../services/realtime.service');
const { publicUrl } = require('../middleware/upload.middleware');

/** POST /api/prescriptions — customer uploads a prescription (multer PDF/image). */
const uploadPrescription = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Please upload a prescription file (PDF or image)');
  const { productId, notes } = req.body;

  const prescription = await Prescription.create({
    customer: req.user._id,
    product: productId || undefined,
    filePath: req.file.path,
    fileUrl: publicUrl('prescriptions', req.file.filename),
    notes: notes || '',
    status: 'PENDING',
  });

  // Alert staff that a prescription awaits verification.
  const staff = await require('../models/User').find({ role: { $in: ['ADMIN', 'SALES_OPERATOR'] }, status: 'ACTIVE' }).select('_id');
  if (staff.length) {
    await require('../models/Notification').insertMany(
      staff.map((u) => ({
        user: u._id,
        type: 'SYSTEM',
        title: 'Prescription review needed',
        message: `${req.user.name} uploaded a prescription awaiting verification.`,
        link: `/dashboard/prescriptions`,
        icon: 'file-check',
        payload: { prescriptionId: prescription._id },
      }))
    );
    for (const u of staff) realtime.emitToUser(u._id, 'notification:new', { type: 'PRESCRIPTION_PENDING' });
  }

  ok(res, { status: 201, message: 'Prescription uploaded. It will be verified before dispatch.', data: { prescription } });
});

/** GET /api/prescriptions/mine */
const myPrescriptions = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(50);
  ok(res, { data: { prescriptions } });
});

/** GET /api/admin/prescriptions — list with optional status filter. */
const listPrescriptions = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));

  const total = await Prescription.countDocuments(query);
  const prescriptions = await Prescription.find(query)
    .populate('customer', 'name email mobile')
    .populate('product', 'name')
    .populate('order', 'orderId')
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  ok(res, { data: { prescriptions, total }, meta: { total, pages: Math.ceil(total / limit) || 0 } });
});

/** PATCH /api/admin/prescriptions/:id/review — { status: APPROVED|REJECTED, note } */
const reviewPrescription = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status)) throw ApiError.badRequest('Status must be APPROVED or REJECTED');

  const prescription = await Prescription.findById(req.params.id).populate('customer', 'name email');
  if (!prescription) throw ApiError.notFound('Prescription not found');

  prescription.status = status;
  prescription.reviewNote = note;
  prescription.reviewedBy = req.user._id;
  prescription.reviewedAt = new Date();
  await prescription.save();

  await notificationService.notifyUser({
    user: prescription.customer._id,
    type: 'SYSTEM',
    title: `Prescription ${status.toLowerCase()}`,
    message: `Your prescription${note ? ` (${note})` : ''} has been ${status.toLowerCase()}.`,
    link: '/dashboard/orders',
    icon: status === 'APPROVED' ? 'badge-check' : 'badge-x',
  });
  realtime.emitToUser(prescription.customer._id, 'prescription:update', { id: prescription._id, status });

  await audit({ user: req.user, action: 'PRESCRIPTION_REVIEWED', resource: 'Prescription', resourceId: prescription._id, details: { status, note }, req });
  ok(res, { message: `Prescription ${status.toLowerCase()}`, data: { prescription } });
});

module.exports = { uploadPrescription, myPrescriptions, listPrescriptions, reviewPrescription };