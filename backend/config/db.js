/**
 * MongoDB (Atlas) connection with retry, error handling and graceful shutdown.
 * The connection string always comes from the MONGODB_URI env var.
 */
const mongoose = require('mongoose');
const env = require('./env');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async ({ retries = 5, retryDelayMs = 3000 } = {}) => {
  const uri = env.isTest && env.mongoUriTest ? env.mongoUriTest : env.mongoUri;

  if (!uri) {
    const varName = env.isTest ? 'MONGODB_URI_TEST' : 'MONGODB_URI';
    throw new Error(
      `${varName} is not configured. Create backend/.env from backend/.env.example and set your MongoDB Atlas connection string.`
    );
  }

  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: !env.isProd, // build indexes automatically outside production
      });
      console.log(`✔ MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);

      // Housekeeping: drop legacy/stale indexes not part of current schemas.
      // `productId_1` (unique) is a leftover from an old Product schema — every
      // new product inserts productId:null, so a second insert 500s with E11000.
      try {
        const products = mongoose.connection.collection('products');
        const indexes = await products.indexes();
        for (const idx of indexes) {
          if (idx.name === 'productId_1') await products.dropIndex('productId_1');
        }
      } catch (err) {
        console.warn(`⚠ Index housekeeping skipped: ${err.message}`);
      }

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB runtime error:', err.message);
      });
      mongoose.connection.on('disconnected', () => {
        if (!env.isTest) console.warn('⚠ MongoDB disconnected');
      });
      return conn;
    } catch (err) {
      lastError = err;
      console.error(`✖ MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) await sleep(retryDelayMs * attempt);
    }
  }
  throw lastError;
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

/** Graceful shutdown: stop accepting requests, close DB, exit cleanly. */
const gracefulShutdown = (server) => async (signal = 'SIGINT') => {
  console.log(`\n${signal} received — shutting down gracefully…`);
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    console.log('✔ Cleanup complete. Goodbye.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err.message);
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB, gracefulShutdown };
