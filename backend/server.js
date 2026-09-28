/**
 * Lalitha Pharmacy — backend entrypoint.
 * Connects to MongoDB Atlas, starts Express + Socket.IO, handles graceful shutdown.
 */
const { buildApp } = require('./app');

const signals = ['SIGINT', 'SIGTERM'];

(async () => {
  try {
    const { server } = await buildApp({ connect: true, listen: true });
    for (const sig of signals) {
      process.once(sig, () => {
        console.log(`Received ${sig} — closing down…`);
        server.close(() => process.exit(0));
      });
    }
    const db = require('./config/db');
    process.once('SIGINT', () => db.disconnectDB().then(() => process.exit(0)));
  } catch (err) {
    console.error(`✖ Failed to start server: ${err.message}`);
    process.exit(1);
  }
})();