const request = require('supertest');

const dbHandler = require('../../tests/dbHandler');
const buildApp = require('../../tests/buildApp');
const contactRouter = require('./contact');
const Contact = require('../../models/contact');

const app = buildApp(contactRouter);

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clear();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await dbHandler.disconnect();
});

describe('POST /add', () => {
  it('rejects a missing email', async () => {
    const res = await request(app)
      .post('/add')
      .send({ name: 'John', message: 'Hi' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('rejects a missing name', async () => {
    const res = await request(app)
      .post('/add')
      .send({ email: 'a@test.com', message: 'Hi' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('rejects a missing message', async () => {
    const res = await request(app)
      .post('/add')
      .send({ email: 'a@test.com', name: 'John' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/i);
  });

  it('rejects a second submission from the same email', async () => {
    await new Contact({
      name: 'John',
      email: 'dup@test.com',
      message: 'Hi'
    }).save();

    const res = await request(app)
      .post('/add')
      .send({ email: 'dup@test.com', name: 'Jane', message: 'Hi again' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already existed/i);
  });

  it('creates a contact request', async () => {
    const res = await request(app)
      .post('/add')
      .send({ email: 'new@test.com', name: 'John', message: 'Hello there' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.contact.email).toBe('new@test.com');

    const stored = await Contact.findOne({ email: 'new@test.com' });
    expect(stored).not.toBeNull();
  });

  it('returns 400 if saving fails unexpectedly', async () => {
    jest.spyOn(Contact.prototype, 'save').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/add')
      .send({ email: 'err@test.com', name: 'John', message: 'Hello' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/could not be processed/i);
  });
});
