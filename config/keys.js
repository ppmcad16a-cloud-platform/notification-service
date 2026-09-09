module.exports = {
  app: {
    name: 'Notification Service',
    apiURL: `${process.env.BASE_API_URL}`
  },
  port: process.env.PORT || 3104,
  database: {
    url: process.env.MONGO_URI
  },
  jwt: {
    // Must be identical across every microservice — used here only to
    // verify the JWT sent during a Socket.IO handshake (socket/index.js),
    // not by an HTTP auth middleware (this service has no passport setup).
    secret: process.env.JWT_SECRET,
    tokenLife: '7d'
  },
  mail: {
    from: process.env.MAIL_FROM || 'no-reply@mern-ecommerce.local'
  }
};
