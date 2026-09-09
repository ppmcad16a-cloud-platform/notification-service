// Notification microservice entry point: contact form, order-confirmation
// email (called by commerce_server over HTTP), and Socket.IO support chat.
// Standalone — shares the MongoDB database and JWT_SECRET with the other
// microservices.
require('dotenv').config();
const express = require('express');
const chalk = require('chalk');
const cors = require('cors');
const helmet = require('helmet');

const keys = require('./config/keys');
const setupDB = require('./utils/db');

const { port } = keys;
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: true
  })
);
app.use(cors());

setupDB();

// User must be registered before socket/index.js is required below (it
// calls mongoose.model('User') at module-load time).
require('./models/user');
require('./models/contact');

const socket = require('./socket');
const routes = require('./routes');
app.use(routes);

const server = app.listen(port, () => {
  console.log(
    `${chalk.green('✓')} ${chalk.blue(
      `notification_server listening on port ${port}. Visit http://localhost:${port}/ in your browser.`
    )}`
  );
});

// Socket.IO piggybacks on the same HTTP server instance rather than
// listening on its own port — this is where the support-chat feature that
// used to live on the monolith's single server now lives.
socket(server);
