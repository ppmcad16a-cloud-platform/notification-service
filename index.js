// Notification microservice entry point: contact form, order-confirmation
// email (called by commerce-service over HTTP), and Socket.IO support chat.
// Standalone — shares the MongoDB database and JWT_SECRET with the other
// microservices.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const keys = require('./config/keys');
const setupDB = require('./utils/db');
const { createObservability } = require('./lib/observability');
const { createProbeRouter, mongooseIsReady } = require('./lib/probes');
const { registerShutdown } = require('./lib/shutdown');

const { port } = keys;

// Metrics label = the matched route template, never the raw URL.
const routeLabel = req => (req.route ? `${req.baseUrl}${req.route.path}` : 'other');

const { logger, httpLogger, metricsMiddleware, metricsHandler } = createObservability({
  service: 'notification-service',
  logLevel: process.env.LOG_LEVEL,
  routeLabel
});

const app = express();

app.use(httpLogger);
app.use(metricsMiddleware);
app.use(createProbeRouter({ isReady: mongooseIsReady(mongoose) }));
app.get('/metrics', metricsHandler);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: true
  })
);
app.use(cors());

setupDB({ logger });

// User must be registered before socket/index.js is required below (it
// calls mongoose.model('User') at module-load time).
require('./models/user');
require('./models/contact');

const socket = require('./socket');
const routes = require('./routes');
app.use(routes);

const server = app.listen(port, () => {
  logger.info({ port }, 'notification-service listening');
});

// Socket.IO piggybacks on the same HTTP server instance rather than
// listening on its own port.
const io = socket(server);

// io.close() disconnects every chat client AND closes the HTTP server;
// plain server.close() would wait forever for the open websockets.
registerShutdown({
  server: { close: callback => io.close(callback) },
  logger,
  cleanup: () => mongoose.disconnect()
});
