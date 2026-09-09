const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const Client = require('socket.io-client');

process.env.PORT = '0';

// index.js is a pure side-effect script (no module.exports) that calls
// app.listen(...) internally, so the only way to get a handle on the real
// server it starts — needed to hit it with supertest/socket.io-client and
// to close it afterward — is to intercept the Express prototype method
// it's about to call, before requiring the script.
let capturedServer;
const originalListen = express.application.listen;
express.application.listen = function (...args) {
  capturedServer = originalListen.apply(this, args);
  return capturedServer;
};

beforeAll(async () => {
  // Neither test below touches a DB-backed route, so index.js's own (real,
  // un-mocked) setupDB() call is left to connect on its own — using the
  // shared in-memory mongod's base URI from tests/setupEnv.js — without
  // needing to coordinate with tests/dbHandler.js's per-file database
  // naming (mongoose is a single shared module within this file's Jest
  // module registry either way).
  require('./index');
  express.application.listen = originalListen;

  await new Promise(resolve => {
    if (capturedServer.listening) return resolve();
    capturedServer.once('listening', resolve);
  });
});

afterAll(async () => {
  await new Promise(resolve => capturedServer.close(resolve));
  await mongoose.disconnect();
});

it('starts a real, listening HTTP server wired up with the API routes', async () => {
  const res = await request(capturedServer).get('/api/does-not-exist');
  expect(res.status).toBe(404);
});

it('attaches Socket.IO to the same HTTP server', async () => {
  const port = capturedServer.address().port;
  const client = Client(`http://localhost:${port}`, {
    reconnection: false,
    forceNew: true,
    transports: ['websocket']
  });

  const err = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), 3000);
    client.once('connect_error', e => {
      clearTimeout(timer);
      resolve(e);
    });
  });

  // No auth token supplied — same authHandler rejection as
  // socket/support.test.js's own tests, just proving *this* server (not a
  // separately-built one) has Socket.IO actually attached.
  expect(err.message).toBe('no token');
  client.close();
});
