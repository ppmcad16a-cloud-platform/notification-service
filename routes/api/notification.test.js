const request = require('supertest');

const buildApp = require('../../tests/buildApp');
const notificationRouter = require('./notification');
const mail = require('../../services/mail');

const app = buildApp(notificationRouter);

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /order-confirmation', () => {
  it('rejects a payload missing user.email', async () => {
    const res = await request(app)
      .post('/order-confirmation')
      .send({ order: { _id: 'o1' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user\.email/i);
  });

  it('rejects a payload missing order._id', async () => {
    const res = await request(app)
      .post('/order-confirmation')
      .send({ user: { email: 'a@test.com' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/order/i);
  });

  it('sends the order-confirmation email and returns success', async () => {
    const sendMailSpy = jest
      .spyOn(mail, 'sendMail')
      .mockResolvedValueOnce({ mocked: true });

    const res = await request(app)
      .post('/order-confirmation')
      .send({
        user: { email: 'buyer@test.com', firstName: 'Jane' },
        order: { _id: 'order123', total: 20 }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@test.com',
        subject: expect.stringContaining('order123')
      })
    );
  });

  it('returns 400 when sending the email throws', async () => {
    jest.spyOn(mail, 'sendMail').mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/order-confirmation')
      .send({
        user: { email: 'buyer@test.com' },
        order: { _id: 'order123' }
      });

    expect(res.status).toBe(400);
  });
});
