describe('config/keys', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('exposes config values sourced from env vars', () => {
    const keys = require('./keys');

    expect(keys.app.name).toBe('Notification Service');
    expect(keys.app.apiURL).toBe('api');
    expect(keys.port).toBeDefined();
    expect(keys.database.url).toBe(process.env.MONGO_URI);
    expect(keys.jwt.secret).toBe('test-jwt-secret');
    expect(keys.jwt.tokenLife).toBe('7d');
    expect(keys.mail.from).toBe('test@mern-ecommerce.local');
  });

  it('falls back to defaults when PORT/MAIL_FROM are unset', () => {
    const originalPort = process.env.PORT;
    const originalMailFrom = process.env.MAIL_FROM;
    delete process.env.PORT;
    delete process.env.MAIL_FROM;

    jest.resetModules();
    const keys = require('./keys');

    expect(keys.port).toBe(3104);
    expect(keys.mail.from).toBe('no-reply@mern-ecommerce.local');

    process.env.PORT = originalPort;
    process.env.MAIL_FROM = originalMailFrom;
  });
});
