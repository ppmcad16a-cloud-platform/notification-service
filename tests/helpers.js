const jwt = require('jsonwebtoken');
const Mongoose = require('mongoose');

const keys = require('../config/keys');
const { ROLES } = require('../constants');
const User = require('../models/user');

// Signs a real, valid token the same way identity_server does, so tests
// exercise the actual JWT verification (socket/index.js's authHandler, the
// only auth check in this service) end to end instead of stubbing anything.
const createToken = user =>
  `Bearer ${jwt.sign({ id: user._id.toString() }, keys.jwt.secret, {
    expiresIn: '1h'
  })}`;

let counter = 0;
const uniqueEmail = () => `user${Date.now()}${counter++}@test.com`;

// No password hashing here (unlike catalog_server's copy of this helper) —
// this service never authenticates by password, only by an already-issued
// JWT, so a plaintext placeholder is enough to satisfy the schema.
const createUser = ({ role = ROLES.Member, ...rest } = {}) => {
  const user = new User({
    email: uniqueEmail(),
    firstName: 'Test',
    lastName: 'User',
    role,
    password: 'unused',
    ...rest
  });
  return user.save();
};

const newId = () => new Mongoose.Types.ObjectId();

module.exports = {
  createToken,
  createUser,
  uniqueEmail,
  newId
};
