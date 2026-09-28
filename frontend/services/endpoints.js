  audit: (params) => api.get('/admin/audit-logs', { params }).then(unwrap),
  orders: (params) => api.get('/admin/orders', { params }).then(unwrap),
  order: (id) => api.get(`/admin/orders/${id}`).then(unwrap),
  updateOrderStatus: (id, payload) => api.patch(`/admin/orders/${id}/status`, payload).then(unwrap),
};