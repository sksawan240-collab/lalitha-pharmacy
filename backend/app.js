const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cookieLib = require('cookie');
const signature = require('cookie-signature');
const session = require('express-session');
const { default: MongoStore } = require('connect-mongo');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const path = require('path');

const env = require('./config/env');
const db = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const realtime = require('./services/realtime.service');
const User = require('./models/User');
const mongoose = require('mongoose');

/** Single shared MongoDB session store (Atlas anywhere in the process — HTTP + Socket.IO). */
let sessionStore = null;
const getSessionStore = () => {
  if (!sessionStore) {
    sessionStore = MongoStore.create({
      client: mongoose.connection.getClient(),
      collectionName: 'sessions',
      ttl: Math.floor(env.session.maxAgeMs / 1000),
      autoRemove: 'native',
    });
  }
  return sessionStore;
};

/**
 * Build the express-session middleware (server-side session + HTTP-only cookie).
 */
const buildSessionMiddleware = () => {
  const isProd = env.isProd;
  const useMongoStore = Boolean(env.mongoUri || env.mongoUriTest);
  return session({
    name: env.session.name,
    secret: env.session.secret,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    proxy: true,
    store: useMongoStore ? getSessionStore() : undefined,
    cookie: {
      httpOnly: true,
      secure: isProd, // true in production (HTTPS)
      sameSite: isProd ? 'none' : 'lax',
      maxAge: env.session.maxAgeMs,
      path: '/',
    },
  });
};

/**
 * Resolve the session id from a raw cookie header (mirrors express-session's
 * cookie handling: `lp.sid=s:<signed-id>`). Used for the Socket.IO handshake
 * where the Express middleware stack does not run.
 */
const resolveSessionId = (req) => {
  const header = req?.headers?.cookie || '';
  const cookies = cookieLib.parse(header);
  let raw = cookies[env.session.name];
  if (!raw && req?.cookies) raw = req.cookies[env.session.name];
  if (!raw) return null;
  if (raw.startsWith('s:')) {
    const val = signature.unsign(raw.slice(2), env.session.secret);
    return val === false ? null : val;
  }
  return raw;
};

const loadSessionData = (sid) =>
  new Promise((resolveValue, rejectValue) => {
    getSessionStore().get(sid, (err, data) => (err ? rejectValue(err) : resolveValue(data)));
  });

/**
 * Build the Express app + Socket.IO server.
 * Optionally skips DB connection + HTTP listen for test suites.
 */
const buildApp = async ({ connect = true, listen = true } = {}) => {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  if (connect) {
    await db.connectDB();
  }

  // Session middleware AFTER the DB is connected (MongoStore needs the client).
  const sessionMiddleware = buildSessionMiddleware();

  /* ── Security / middleware ─────────────────────────────────── */
  app.use(
    helmet({
      contentSecurityPolicy: env.isProd ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    cors({
      origin: env.frontendUrl.split(',').map((s) => s.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  // express-session: server-side sessions in MongoDB Atlas + secure HTTP-only cookie.
  // NO JWT, NO Authorization: Bearer, NO localStorage tokens.
  app.use(sessionMiddleware);
  app.use(hpp());
  app.use(mongoSanitize());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: env.rateLimit.apiMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests — please slow down.' },
    })
  );

  /* ── Static uploads ────────────────────────────────────────── */
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  /* ── Health + API ──────────────────────────────────────────── */
  app.get('/api/health', (req, res) =>
    res.json({ success: true, message: 'Lalitha Pharmacy API is healthy', data: { time: new Date().toISOString() } })
  );
  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  /* ── HTTP server + Socket.IO ───────────────────────────────── */
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.frontendUrl.split(',').map((s) => s.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  realtime.initRealtime(io);

  // Socket.IO authenticates through the SAME server-side session (cookie-based,
  // no JWT / tokens). The Express stack does not run for the WebSocket upgrade,
  // so we resolve the signed session cookie and read the session from MongoDB
  // directly — exactly what express-session does for HTTP requests.
  io.use(async (socket, next) => {
    try {
      const sid = resolveSessionId(socket.request);
      if (!sid) throw new Error('missing session');
      const data = await loadSessionData(sid);
      if (!data || !data.userId) throw new Error('invalid session');
      const user = await User.findById(data.userId);
      if (!user || user.status !== 'ACTIVE') throw new Error('user unavailable');
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (!user) return;
    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role.toLowerCase()}`);
    realtime.emitToUser(user._id, 'connected', { message: `Welcome, ${user.name}` });

    socket.on('disconnect', () => {
      socket.leave(`user:${user._id}`);
      socket.leave(`role:${user.role.toLowerCase()}`);
    });
  });

  if (listen) {
    server.listen(env.port, () => {
      console.log(`✔ Lalitha Pharmacy API + Socket.IO → http://localhost:${env.port}`);
    });
  }

  return { app, server, io };
};

module.exports = { buildApp, buildSessionMiddleware };