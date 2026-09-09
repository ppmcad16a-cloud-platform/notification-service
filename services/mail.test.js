const mail = require('./mail');

afterEach(() => {
  jest.restoreAllMocks();
});

it('mocks delivery by logging the rendered email and resolving mocked: true', async () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  const result = await mail.sendMail({
    to: 'buyer@test.com',
    subject: 'Order Confirmation',
    html: '<p>hi</p>'
  });

  expect(result).toEqual({ mocked: true });
  expect(logSpy).toHaveBeenCalled();
  const loggedOutput = logSpy.mock.calls.flat().join('\n');
  expect(loggedOutput).toContain('buyer@test.com');
  expect(loggedOutput).toContain('Order Confirmation');
});
