const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const audit = require('../services/audit.service');

/** GET /api/categories — active categories for the storefront. */
const listActive = asyncHandler(async (req, res) => {
  const categories = await Category.find({ active: true })
    .sort({ name: 1 })
    .lean();
  const counts = await Product.aggregate([
    { $match: { active: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  const withCounts = categories.map((c) => ({ ...c, productCount: countMap.get(c._id.toString()) || 0 }));
  ok(res, { data: { categories: withCounts } });
});

/** GET /api/admin/categories — full list with counts (admin). */
const adminList = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ name: 1 }).lean();
  const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  ok(res, { data: { categories: categories.map((c) => ({ ...c, productCount: countMap.get(c._id.toString()) || 0 })) } });
});

/** POST /api/admin/categories — ADMIN ONLY. */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;
  const slug = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!name || !slug) throw ApiError.badRequest('Category name is required');

  const existing = await Category.findOne({ slug });
  if (existing) throw ApiError.conflict('A category with this name already exists');

  const category = await Category.create({ name, slug, description: description || '', icon: icon || '' });
  await audit({ user: req.user, action: 'CATEGORY_CREATED', resource: 'Category', resourceId: category._id, details: { name }, req });
  ok(res, { status: 201, message: 'Category created', data: { category } });
});

/** PATCH /api/admin/categories/:id — ADMIN ONLY. */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  if (req.body.name) {
    category.name = req.body.name;
    category.slug = String(req.body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  if (req.body.description !== undefined) category.description = req.body.description;
  if (req.body.icon !== undefined) category.icon = req.body.icon;
  if (req.body.active !== undefined) category.active = Boolean(req.body.active);
  await category.save();

  await audit({ user: req.user, action: 'CATEGORY_UPDATED', resource: 'Category', resourceId: category._id, details: { name: category.name }, req });
  ok(res, { message: 'Category updated', data: { category } });
});

/** DELETE /api/admin/categories/:id — ADMIN ONLY (system/seed categories protected). */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  if (category.isSystem) throw ApiError.forbidden('System categories cannot be deleted');

  const used = await Product.countDocuments({ category: category._id });
  if (used > 0) throw ApiError.conflict(`Category has ${used} product(s). Reassign or delete them first.`);

  await category.deleteOne();
  await audit({ user: req.user, action: 'CATEGORY_DELETED', resource: 'Category', resourceId: category._id, details: { name: category.name }, req });
  ok(res, { message: 'Category deleted' });
});

module.exports = { listActive, adminList, createCategory, updateCategory, deleteCategory };