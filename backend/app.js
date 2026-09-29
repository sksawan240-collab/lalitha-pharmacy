```javascript
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

/** Single shared MongoDB session store */
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
 * Build the express-session middleware.
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

      // HTTPS on Render
      secure: isProd,

      // Required for cross-origin frontend/backend cookies
      sameSite: isProd ? 'none' : 'lax',

      maxAge: env.session.maxAgeMs,
      path: '/',
    },
  });
};

/**
 * Resolve session ID from cookie.
 */
const resolveSessionId = (req) => {
  const header = req?.headers?.cookie || '';
  const cookies = cookieLib.parse(header);

  let raw = cookies[env.session.name];

  if (!raw && req?.cookies) {
    raw = req.cookies[env.session.name];
  }

  if (!raw) {
    return null;
  }

  if (raw.startsWith('s:')) {
    const val = signature.unsign(
      raw.slice(2),
      env.session.secret
    );

    return val === false ? null : val;
  }

  return raw;
};

const loadSessionData = (sid) =>
  new Promise((resolveValue, rejectValue) => {
    getSessionStore().get(
      sid,
      (err, data) => (err ? rejectValue(err) : resolveValue(data))
    );
  });

/**
 * Build Express application + Socket.IO server.
 */
const buildApp = async ({ connect = true, listen = true } = {}) => {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  if (connect) {
    await db.connectDB();
  }

  // Session middleware
  const sessionMiddleware = buildSessionMiddleware();

  /* ─────────────────────────────────────────────
     CORS CONFIGURATION
     ───────────────────────────────────────────── */

  const frontendOrigins = String(env.frontendUrl || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  console.log('Allowed frontend origins:', frontendOrigins);

  app.use(
    helmet({
      contentSecurityPolicy: env.isProd ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: frontendOrigins,
      credentials: true,
      methods: [
        'GET',
        'POST',
        'PATCH',
        'PUT',
        'DELETE',
        'OPTIONS',
      ],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-requested-with',
      ],
    })
  );

  // Handle OPTIONS preflight requests
  app.options('*', cors({
    origin: frontendOrigins,
    credentials: true,
  }));

  app.use(compression());

  app.use(
    express.json({
      limit: '1mb',
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    })
  );

  app.use(cookieParser());

  // Server-side sessions
  app.use(sessionMiddleware);

  app.use(hpp());

  app.use(mongoSanitize());

  if (!env.isTest) {
    app.use(
      morgan(env.isProd ? 'combined' : 'dev')
    );
  }

  /* ─────────────────────────────────────────────
     RATE LIMITING
     ───────────────────────────────────────────── */

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: env.rateLimit.apiMax,
      standardHeaders: true,
      legacyHeaders: false,

      message: {
        success: false,
        message: 'Too many requests — please slow down.',
      },
    })
  );

  /* ─────────────────────────────────────────────
     STATIC UPLOADS
     ───────────────────────────────────────────── */

  app.use(
    '/uploads',
    express.static(
      path.join(__dirname, 'uploads')
    )
  );

  /* ─────────────────────────────────────────────
     HEALTH CHECK
     ───────────────────────────────────────────── */

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Lalitha Pharmacy API is healthy',
      data: {
        time: new Date().toISOString(),
      },
    });
  });

  /* ─────────────────────────────────────────────
     API ROUTES
     ───────────────────────────────────────────── */

  app.use(routes);

  /* ─────────────────────────────────────────────
     ERROR HANDLERS
     ───────────────────────────────────────────── */

  app.use(notFound);
  app.use(errorHandler);

  /* ─────────────────────────────────────────────
     HTTP SERVER
     ───────────────────────────────────────────── */

  const server = http.createServer(app);

  /* ─────────────────────────────────────────────
     SOCKET.IO
     ───────────────────────────────────────────── */

  const io = new Server(server, {
    cors: {
      origin: frontendOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  realtime.initRealtime(io);

  /* ─────────────────────────────────────────────
     SOCKET SESSION AUTHENTICATION
     ───────────────────────────────────────────── */

  io.use(async (socket, next) => {
    try {
      const sid = resolveSessionId(socket.request);

      if (!sid) {
        throw new Error('missing session');
      }

      const data = await loadSessionData(sid);

      if (!data || !data.userId) {
        throw new Error('invalid session');
      }

      const user = await User.findById(data.userId);

      if (!user || user.status !== 'ACTIVE') {
        throw new Error('user unavailable');
      }

      socket.user = user;

      next();
    } catch (err) {
      next(
        new Error('Unauthorized socket connection')
      );
    }
  });

  /* ─────────────────────────────────────────────
     SOCKET CONNECTION
     ───────────────────────────────────────────── */

  io.on('connection', (socket) => {
    const user = socket.user;

    if (!user) {
      return;
    }

    socket.join(`user:${user._id}`);
    socket.join(`role:${user.role.toLowerCase()}`);

    realtime.emitToUser(
      user._id,
      'connected',
      {
        message: `Welcome, ${user.name}`,
      }
    );

    socket.on('disconnect', () => {
      socket.leave(`user:${user._id}`);
      socket.leave(`role:${user.role.toLowerCase()}`);
    });
  });

  /* ─────────────────────────────────────────────
     START SERVER
     ───────────────────────────────────────────── */

  if (listen) {
    server.listen(
      env.port,
      '0.0.0.0',
      () => {
        console.log(
          `✔ Lalitha Pharmacy API + Socket.IO running on port ${env.port}`
        );
      }
    );
  }

  return {
    app,
    server,
    io,
  };
};

module.exports = {
  buildApp,
  buildSessionMiddleware,
};
```
