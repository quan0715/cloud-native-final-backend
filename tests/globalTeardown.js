const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function globalTeardown() {
  const instance = global.__MONGOINSTANCE;
  await instance.stop();
}

module.exports = globalTeardown;
