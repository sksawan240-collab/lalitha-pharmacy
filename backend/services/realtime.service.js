/**
 * Socket.IO real-time hub. Kept module-level so controllers and services can
 * emit events without a request context.
 *
 * Events (server → client):
 *   notification:new          { notification }
 *   order:{orderId}:update    { orderId, status }
 *   product:created|updated   { product }
 *   product:deleted           { productId }
 *   inventory:update          { productId, quantity }
 *   low-stock:alert           { alert }
 *   expiry:alert              { alert }
 *   announcement:new          { announcement }
 */
let ioInstance = null;

const initRealtime = (ioServer) => {
  ioInstance = ioServer;
};

const getIO = () => ioInstance;

/** Deliver an event to one user (their own socket room). */
const emitToUser = (userId, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

/** Deliver to every connected client (broadcasts). */
const emitBroadcast = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
};

/** Emit to all users holding a given role (e.g. ADMIN, SALES_OPERATOR). */
const emitToRole = (role, event, payload) => {
  if (!ioInstance) return;
  ioInstance.to(`role:${role.toLowerCase()}`).emit(event, payload);
};

module.exports = { initRealtime, getIO, emitToUser, emitBroadcast, emitToRole };