const orderConfirmationTemplate = require('./orderConfirmation');

it('greets the user by name, lists non-cancelled items, and shows totals', () => {
  const html = orderConfirmationTemplate({
    user: { firstName: 'Jane' },
    order: {
      _id: 'order123',
      products: [
        {
          product: { name: 'Widget' },
          quantity: 2,
          totalPrice: 20,
          status: 'Not processed'
        },
        {
          product: { name: 'Cancelled Thing' },
          quantity: 1,
          totalPrice: 10,
          status: 'Cancelled'
        }
      ],
      total: 20,
      totalTax: 1,
      totalWithTax: 21
    }
  });

  expect(html).toContain('Jane');
  expect(html).toContain('Widget');
  expect(html).not.toContain('Cancelled Thing');
  expect(html).toContain('order123');
  expect(html).toContain('21.00');
});

it('falls back to a generic greeting/name and zeroed totals when data is missing', () => {
  const html = orderConfirmationTemplate({
    user: {},
    order: {
      _id: 'o2',
      products: [{ quantity: 1, status: 'Not processed' }]
    }
  });

  expect(html).toContain('Thank you for your order!');
  expect(html).toContain('Product');
  expect(html).toContain('0.00');
});
