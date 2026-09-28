const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const audit = require('../services/audit.service');
const realtime = require('../services/realtime.service');
const { runExpiryScan } = require('../services/inventory.service');

const SEARCHABLE_TEXT = { $text: { $search: '' } };

/** Build the public shop query from filters. */
const buildQuery = ({ q = '', category, brand, maxPrice, minPrice, inStock, prescription, sort = 'latest' }) => {
  const query = { active: true };

  if (q && q.trim()) {
    query.$text = { $search: q.trim() };
  }
  if (category && category !== 'all') {
    query.category = category;
  }
  if (brand && brand !== 'all') {
    query.brandName = brand;
  }
  if (minPrice !== undefined && minPrice !== '') query.distributorPrice = { $gte: Number(minPrice) };
  if (maxPrice !== undefined && maxPrice !== '') {
    query.distributorPrice = { ...(query.distributorPrice || {}), $lte: Number(maxPrice) };
  }
  if (inStock === 'true') query.quantity = { $gt: 0 };
  if (prescription === 'true') query.prescriptionRequired = true;
  if (prescription === 'false') query.prescriptionRequired = false;

  return query;
};

const buildSort = (sort) => {
  switch (sort) {
    case 'price_asc':
      return { distributorPrice: 1 };
    case 'price_desc':
      return { distributorPrice: -1 };
    case 'name_asc':
      return { name: 1 };
    case 'newest':
      return { createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
};

/**
 * GET /api/products — public catalogue with pagination + filters + facets.
 * Queries MongoDB directly (text index); never a frontend-only list.
 */
const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(60, Math.max(1, parseInt(req.query.limit || '12', 10)));
  const query = buildQuery(req.query);
  const sort = buildSort(req.query.sort || 'latest');

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const categories = await Category.find({ active: true }).sort({ name: 1 });
  const brands = await Product.distinct('brandName', { active: true, brandName: { $ne: '' } });

  ok(res, {
    data: { products, total, page, limit, facets: { categories, brands } },
    meta: { page, limit, total, pages: total === 0 ? 0 : Math.ceil(total / limit) },
  });
});

/** GET /api/products/featured — latest available products for the landing. */
const featuredProducts = asyncHandler(async (req, res) => {
  const limit = Math.min(12, parseInt(req.query.limit || '8', 10));
  const products = await Product.find({ active: true, quantity: { $gt: 0 } })
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
  ok(res, { data: { products } });
});

/** GET /api/products/suggestions?q= — fast autocomplete for search. */
const suggestions = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return ok(res, { data: { suggestions: [] } });
  const products = await Product.find(
    { active: true, $text: { $search: q } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(8)
    .select('name genericName brandName category quantity distributorPrice');
  ok(res, { data: { suggestions: products } });
});

/** GET /api/products/:id — public detail. */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug')
    .populate('createdBy', 'name');
  if (!product || !product.active) throw ApiError.notFound('Product not found');
  ok(res, { data: { product } });
});

module.exports = { listProducts, featuredProducts, suggestions, getProduct, buildQuery, buildSort };