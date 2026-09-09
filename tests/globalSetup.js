const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'globalConfig.json');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;

  fs.writeFileSync(configPath, JSON.stringify({ mongoUri: mongod.getUri() }));
};
