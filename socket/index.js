const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { ROLES } = require('../constants');
const keys = require('../config/keys');
const User = mongoose.model('User');

const support = require('./support');

// Verifies the JWT sent during the socket handshake — same token
// format/secret as the REST APIs across every microservice.
const authHandler = async (socket, next) => {
  const { token = null } = socket.handshake.auth;
  if (token) {
    const [authType, tokenValue] = token.trim().split(' ');
    if (authType !== 'Bearer' || !tokenValue) {
      return next(new Error('no token'));
    }

    const { secret } = keys.jwt;
    // jwt.verify THROWS for an expired, tampered or garbage token. Inside
    // this async middleware an uncaught throw would leave the handshake
    // hanging forever (next() never called), so reject cleanly instead.
    let payload;
    try {
      payload = jwt.verify(tokenValue, secret);
    } catch (err) {
      return next(new Error('invalid token'));
    }
    const id = payload.id.toString();
    const user = await User.findById(id);

    if (!user) {
      return next(new Error('no user found'));
    }

    const u = {
      id,
      role: user?.role,
      isAdmin: user.role === ROLES.Admin,
      name: `${user?.firstName} ${user?.lastName}`,
      socketId: socket.id,
      messages: []
    };

    const existingUser = support.findUserById(id);
    if (!existingUser) {
      support.users.push(u);
    } else {
      existingUser.socketId = socket.id;
    }
  } else {
    return next(new Error('no token'));
  }

  next();
};

// Attaches Socket.IO to notification_server's own HTTP server, powering the
// real-time member<->admin support chat. Moved here unchanged from the
// original monolith's server/socket/index.js.
const socket = server => {
  const io = socketio(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use(authHandler);

  const onConnection = socket => {
    support.supportHandler(io, socket);
  };

  io.on('connection', onConnection);

  // Returned so index.js can close all chat connections on shutdown.
  return io;
};

module.exports = socket;
