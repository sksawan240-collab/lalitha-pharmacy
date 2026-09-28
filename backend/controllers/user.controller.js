const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const audit = require('../services/audit.service');

/** GET /api/users/me */
const me = asyncHandler(async (req, res) => {
  ok(res, { message: 'Profile loaded', data: { user: req.user } });
});

/** PATCH /api/users/me — update own profile fields. */
const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'mobile', 'profileImage'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (req.body.notificationPreferences) {
    updates.notificationPreferences = req.body.notificationPreferences;
  }
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  await audit({ user, action: 'PROFILE_UPDATED', resource: 'User', resourceId: user._id, req });
  ok(res, { message: 'Profile updated', data: { user } });
});

/** POST /api/users/password — verify current, set new. */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();
  await audit({ user, action: 'PASSWORD_CHANGED', resource: 'User', resourceId: user._id, req });
  // Keep the current session alive (user just proved they know the password).
  ok(res, { message: 'Password changed successfully. Please use it on your next login.' });
});

/* ── Addresses ──────────────────────────────────────────────── */

const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses');
  ok(res, { data: { addresses: user.addresses } });
});

const addAddress = asyncHandler(async (req, res) => {
  const { label, addressLine1, addressLine2, city, state, pincode, isDefault } = req.body;
  const user = await User.findById(req.user._id);
  if (user.addresses.length >= 8) throw ApiError.badRequest('Maximum 8 addresses allowed');

  if (isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push({
    label: label || 'Home',
    addressLine1: addressLine1 || '',
    addressLine2: addressLine2 || '',
    city: city || '',
    state: state || '',
    pincode: pincode || '',
    isDefault: Boolean(isDefault) || user.addresses.length === 0,
  });
  await user.save();
  ok(res, { status: 201, message: 'Address added', data: { addresses: user.addresses } });
});

const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(id);
  if (!address) throw ApiError.notFound('Address not found');

  const fields = ['label', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode'];
  for (const key of fields) {
    if (req.body[key] !== undefined) address[key] = req.body[key];
  }
  if (req.body.isDefault) {
    user.addresses.forEach((a) => (a.isDefault = a._id.toString() === id));
  }
  await user.save();
  ok(res, { message: 'Address updated', data: { addresses: user.addresses } });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(id);
  if (!address) throw ApiError.notFound('Address not found');
  address.deleteOne();
  await user.save();
  ok(res, { message: 'Address deleted', data: { addresses: user.addresses } });
});

module.exports = { me, updateMe, changePassword, getAddresses, addAddress, updateAddress, deleteAddress };