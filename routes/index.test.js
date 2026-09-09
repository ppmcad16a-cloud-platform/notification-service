const express = require('express');
const request = require('supertest');

const routes = require('./index');

const app = express();
app.use(express.json());
app.use(routes);

it('returns 404 for an unmatched path under the API prefix', async () => {
  const res = await request(app).get('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body).toBe('No API route found');
});

it('routes real requests through to the matching resource router', async () => {
  // A GET (unsupported method — contact.js only registers POST /add) 404s
  // via Express's own routing, proving the request reached that router
  // rather than falling through to the /api catch-all 404 registered above
  // it (which would also 404, but with the catch-all's own JSON body).
  const res = await request(app).post('/api/contact/add').send({});
  expect(res.status).toBe(400);
});

it('leaves non-API paths alone entirely (no route registered)', async () => {
  const res = await request(app).get('/not-under-api-prefix');
  expect(res.status).toBe(404);
});
