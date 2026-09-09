const express = require('express');

require('./registerModels');

// Minimal Express app for supertest: JSON body parsing + the router itself
// mounted at the root, so tests hit the router's own relative paths
// (e.g. '/add') directly instead of re-declaring routes/api/index.js's
// mount prefixes. Unlike catalog_server's tests/buildApp.js, no Passport
// setup is wired in here — this service has none (no route in it uses the
// `auth` middleware; the only auth check anywhere is socket/index.js's own
// raw JWT verify, exercised via tests/helpers.js's createToken + a real
// socket connection instead).
const buildApp = router => {
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use('/', router);
  return app;
};

module.exports = buildApp;
