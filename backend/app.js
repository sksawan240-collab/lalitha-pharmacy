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
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: env.session.maxAgeMs,
      path: '/',
      // CRITICAL FIX: In production with cross-origin requests, explicitly set domain
      // This ensures the cookie is sent across different Render subdomains
      domain: isProd && env.cookieDomain ? env.cookieDomain : undefined,
    },
  });
};

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
    getSessionStore().get(sid, (err, data) => {
      if (err) {
        rejectValue(err);
      } else {
        resolveValue(data);
      }
    });
  });

const buildApp = async ({ connect = true, listen = true } = {}) => {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Connect database
  if (connect) {
    await db.connectDB();
  }

  // Session middleware
  const sessionMiddleware = buildSessionMiddleware();

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: env.isProd ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS — Allow multiple frontend origins with credentials
  const corsOrigins = env.frontendUrls;
  console.log('✔ CORS allowed origins:', corsOrigins);

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`✖ CORS rejected origin: ${origin}`);
        callback(new Error(`CORS policy: origin ${origin} is not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'X-Requested-With'],
    maxAge: 86400,
  };

  app.use(cors(corsOptions));
  // Handle preflight explicitly
  app.options('*', cors(corsOptions));

  // Compression
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: '1mb' }));

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    })
  );

  // Cookies
  app.use(cookieParser());

  // Sessions
  app.use(sessionMiddleware);

  // Security middleware
  app.use(hpp());
  app.use(mongoSanitize());

  // Logging
  if (!env.isTest) {
    app.use(
      morgan(
        env.isProd
          ? 'combined'
          : 'dev'
      )
    );
  }

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: env.rateLimit.apiMax,
      standardHeaders: true,
      legacyHeaders: false,

      message: {
        success: false,
        message:
          'Too many requests — please slow down.',
      },
    })
  );

  // Uploaded files
  app.use(
    '/uploads',
    express.static(
      path.join(__dirname, 'uploads')
    )
  );

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Lalitha Pharmacy API is healthy',

      data: {
        time: new Date().toISOString(),
      },
    });
  });

  // API routes
  app.use(routes);

  // 404 handler
  app.use(notFound);

  // Error handler
  app.use(errorHandler);

  // Create HTTP server
  const server = http.createServer(app);

  // Socket.IO
  const io = new Server(server, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
      maxAge: 86400,
    },
  });

  // Initialize realtime service
  realtime.initRealtime(io);

  // Socket authentication
  io.use(async (socket, next) => {
    try {
      const sid = resolveSessionId(
        socket.request
      );

      if (!sid) {
        throw new Error('missing session');
      }

      const data = await loadSessionData(sid);

      if (!data || !data.userId) {
        throw new Error('invalid session');
      }

      const user = await User.findById(
        data.userId
      );

      if (
        !user ||
        user.status !== 'ACTIVE'
      ) {
        throw new Error('user unavailable');
      }

      socket.user = user;

      next();
    } catch (err) {
      next(
        new Error(
          'Unauthorized socket connection'
        )
      );
    }
  });

  // Socket.IO connection
  io.on('connection', (socket) => {
    const user = socket.user;

    if (!user) {
      return;
    }

    socket.join(
      `user:${user._id}`
    );

    socket.join(
      `role:${user.role.toLowerCase()}`
    );

    realtime.emitToUser(
      user._id,
      'connected',
      {
        message: `Welcome, ${user.name}`,
      }
    );

    socket.on('disconnect', () => {
      socket.leave(
        `user:${user._id}`
      );

      socket.leave(
        `role:${user.role.toLowerCase()}`
      );
    });
  });

  // Start server
  if (listen) {
    server.listen(env.port, () => {
      console.log(
        `✔ Lalitha Pharmacy API + Socket.IO → http://localhost:${env.port}`
      );
    });
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
