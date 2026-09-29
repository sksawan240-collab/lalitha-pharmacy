require('dotenv').config();

const { buildApp } = require('./app');
const { gracefulShutdown } = require('./config/db');
const env = require('./config/env');

const startServer = async () => {
  try {
    console.log(`Starting Lalitha Pharmacy API (${env.nodeEnv})`);

    const { app, server, io } = await buildApp({
      connect: true,
      listen: true,
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', gracefulShutdown(server));
    process.on('SIGINT', gracefulShutdown(server));

    return { app, server, io };
  } catch (err) {
    console.error('✖ Server startup failed:', err.message);
    process.exit(1);
  }
};

// Start server
startServer();

module.exports = startServer;
