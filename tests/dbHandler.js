const mongoose = require('mongoose');
const crypto = require('crypto');

// Connects this test file's mongoose instance to the shared in-memory Mongo
// *instance* (URI provided by tests/setupEnv.js via tests/globalSetup.js),
// but into a database name unique to this connect() call. Jest runs test
// files in parallel workers by default, and every file's afterEach wipes
// every collection in its database (see clear() below) — sharing one
// database across files meant one file's cleanup could delete another
// file's in-flight test data. A private database per file/connection avoids
// that entirely while still reusing one mongod process.
let connectedUri;

const connect = async () => {
  const dbName = `test_${crypto.randomUUID().replace(/-/g, '')}`;
  const baseUri = process.env.MONGO_URI.endsWith('/')
    ? process.env.MONGO_URI
    : `${process.env.MONGO_URI}/`;

  connectedUri = `${baseUri}${dbName}`;
  await mongoose.connect(connectedUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
  });
};

const currentUri = () => connectedUri;

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

const clear = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

module.exports = { connect, disconnect, clear, currentUri };
