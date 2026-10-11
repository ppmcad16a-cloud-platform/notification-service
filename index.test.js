const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const Client = require('socket.io-client');

process.env.PORT = '0';
process.env.LOG_LEVEL = 'silent';

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
  // index.js's own (real, un-mocked) setupDB() connects to the shared
  // in-memory mongod from tests/setupEnv.js.
  require('./index');
  express.application.listen = originalListen;

  await new Promise(resolve => {
    if (capturedServer.listening) return resolve();
    capturedServer.once('listening', resolve);
  });

  if (mongoose.connection.readyState !== 1) {
    await new Promise(resolve => mongoose.connection.once('connected', resolve));
  }
});

// Shutting down through the real SIGTERM handler both cleans up after the
// tests and proves graceful shutdown closes Socket.IO, the server and the DB.
afterAll(async () => {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  process.emit('SIGTERM');
  await new Promise(resolve => {
    const check = () => (exitSpy.mock.calls.length ? resolve() : setTimeout(check, 20));
    check();
  });

  expect(exitSpy).toHaveBeenCalledWith(0);
  expect(capturedServer.listening).toBe(false);
  expect(mongoose.connection.readyState).toBe(0);
  exitSpy.mockRestore();
});

it('starts a real, listening HTTP server wired up with the API routes', async () => {
  const res = await request(capturedServer).get('/api/does-not-exist');
  expect(res.status).toBe(404);
});

it('serves the liveness and readiness probes', async () => {
  expect((await request(capturedServer).get('/health')).status).toBe(200);
  expect((await request(capturedServer).get('/ready')).status).toBe(200);
});

it('labels metrics with the route template, not the raw URL', async () => {
  await request(capturedServer).post('/api/contact/add').send({});

  const res = await request(capturedServer).get('/metrics');
  expect(res.status).toBe(200);
  expect(res.text).toContain('route="/api/contact/add"');
  expect(res.text).toContain('route="other"');
  expect(res.text).toContain('service="notification-service"');
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
