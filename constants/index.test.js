const constants = require('./index');

it('exposes the ROLES enum used by socket/index.js', () => {
  expect(constants.ROLES).toEqual({
    Admin: 'ROLE ADMIN',
    Member: 'ROLE MEMBER',
    Merchant: 'ROLE MERCHANT'
  });
});
