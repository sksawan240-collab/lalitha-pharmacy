import api, { unwrap } from './api';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then(unwrap),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload).then(unwrap),
  resendOtp: (payload) => api.post('/auth/resend-otp', payload).then(unwrap),
  login: (payload) => api.post('/auth/login', payload).then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  // Destroys the server-side session + clears the session cookie.
  logout: () => api.post('/auth/logout').then(unwrap),
  forgot: (email) => api.post('/auth/forgot-password', { email }).then(unwrap),
  reset: (payload) => api.post('/auth/reset-password', payload).then(unwrap),
};

export const productApi = {
  list: (params) => api.get('/products', { params }).then(unwrap),
  get: (id) => api.get(`/products/${id}`).then(unwrap),
  suggestions: (q) => api.get('/products/search/suggestions', { params: { q } }).then(unwrap),
  categories: () => api.get('/categories').then(unwrap),
};

export const cartApi = {
  get: () => api.get('/cart').then(unwrap),
  add: (payload) => api.post('/cart/items', payload).then(unwrap),
  update: (productId, quantity) => api.patch(`/cart/items/${productId}`, { quantity }).then(unwrap),
  remove: (productId) => api.delete(`/cart/items/${productId}`).then(unwrap),
  clear: () => api.delete('/cart').then(unwrap),
};

export const orderApi = {
  create: (payload) => api.post('/orders', payload).then(unwrap),
  mine: (params) => api.get('/orders/mine', { params }).then(unwrap),
  get: (id) => api.get(`/orders/${id}`).then(unwrap),
  track: (id) => api.get(`/orders/${id}/track`).then(unwrap),
  cancel: (id) => api.post(`/orders/${id}/cancel`).then(unwrap),
};

export const invoiceApi = {
  mine: () => api.get('/invoices/mine').then(unwrap),
  get: (id) => api.get(`/invoices/${id}`).then(unwrap),
  // Cookie-authenticated download — no tokens in URL/localStorage.
  download: (id) => api.get(`/invoices/${id}/file`, { responseType: 'blob' }).then((res) => res.data),
  downloadUrl: (id) => `${api.defaults.baseURL}/invoices/${id}/file`,
};

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }).then(unwrap),
  read: (id) => api.patch(`/notifications/${id}/read`).then(unwrap),
  readAll: () => api.patch('/notifications/read-all').then(unwrap),
};

export const announcementApi = { list: () => api.get('/announcements').then(unwrap) };

export const chatbotApi = {
  ask: (payload) => api.post('/chatbot', payload).then(unwrap),
};

export const prescriptionApi = {
  upload: (formData) => api.post('/prescriptions', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  mine: () => api.get('/prescriptions').then(unwrap),
};

export const userApi = {
  profile: () => api.get('/users/me').then(unwrap),
  update: (payload) => api.patch('/users/me', payload).then(unwrap),
  password: (payload) => api.patch('/users/me/password', payload).then(unwrap),
};

export const wishlistApi = {
  list: () => api.get('/users/me/wishlist').then(unwrap),
  toggle: (productId) => api.post(`/users/me/wishlist/${productId}`).then(unwrap),
};

export const adminApi = {
  overview: () => api.get('/admin/overview').then(unwrap),
  analytics: () => api.get('/admin/analytics').then(unwrap),
  reports: () => api.get('/admin/reports').then(unwrap),
  products: (params) => api.get('/admin/products', { params }).then(unwrap),
  createProduct: (fd) => api.post('/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  updateProduct: (id, fd) => api.patch(`/admin/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`).then(unwrap),
  adjustStock: (id, change, reason) => api.patch(`/admin/products/${id}/stock`, { change, reason }).then(unwrap),
  users: (params) => api.get('/admin/users', { params }).then(unwrap),
  createStaff: (payload) => api.post('/admin/users', payload).then(unwrap),
  updateUser: (id, payload) => api.patch(`/admin/users/${id}`, payload).then(unwrap),
  lowStock: () => api.get('/admin/low-stock').then(unwrap),
  expiry: (days) => api.get('/admin/expiry', { params: { days } }).then(unwrap),
  audit: (params) => api.get('/admin/audit-logs', { params }).then(unwrap),
  orders: (params) => api.get('/admin/orders', { params }).then(unwrap),
  order: (id) => api.get(`/admin/orders/${id}`).then(unwrap),
  updateOrderStatus: (id, payload) => api.patch(`/admin/orders/${id}/status`, payload).then(unwrap),
};

export const salesApi = {
  overview: () => api.get('/sales/overview').then(unwrap),
  orders: (params) => api.get('/sales/orders', { params }).then(unwrap),
  order: (id) => api.get(`/sales/orders/${id}`).then(unwrap),
  updateStatus: (id, payload) => api.patch(`/sales/orders/${id}/status`, payload).then(unwrap),
  customers: (params) => api.get('/sales/customers', { params }).then(unwrap),
  lowStock: () => api.get('/sales/low-stock').then(unwrap),
  reviewPrescription: (id, payload) => api.patch(`/sales/prescriptions/${id}`, payload).then(unwrap),
};