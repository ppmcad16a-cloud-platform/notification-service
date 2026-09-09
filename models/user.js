// Duplicated (trimmed) from identity_server/models/user.js, which owns this
// collection. notification_server only needs this registered for
// socket/index.js's connection-time lookup (role/name for the support-chat
// user list) — never writes to it. Same shared MongoDB database, not a
// data copy.
const Mongoose = require('mongoose');

const { ROLES } = require('../constants');

const { Schema } = Mongoose;

const UserSchema = new Schema({
  email: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  password: {
    type: String
  },
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    default: null
  },
  provider: {
    type: String,
    default: 'Email'
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    default: ROLES.Member,
    enum: [ROLES.Admin, ROLES.Member, ROLES.Merchant]
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  updated: Date,
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = Mongoose.model('User', UserSchema);
