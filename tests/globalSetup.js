const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require("../models/User");
const bcrypt = require("bcrypt");

async function globalSetup() {
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();
  global.__MONGOINSTANCE = instance;
  // process.env.MONGODB_URI = uri.slice(0, uri.lastIndexOf('/'));
  process.env.MONGODB_URI = uri + 'mini-lab'
  console.log(process.env.MONGODB_URI)

  const conn = await mongoose.connect(`${process.env.MONGODB_URI}`);
  await conn.connection.db.dropDatabase();
  await createDummyUser();
  await mongoose.disconnect();
};

async function createDummyUser() {
  const id = "leader001";
  const password = "123456";
  const role = "leader";
  await mongoose.connect(process.env.MONGODB_URI);
  const exist = await User.findOne({ id: id });
  if (exist) {
    console.log(`⚠️ 帳號 ${id} 已存在，略過建立`);
    process.exit();
  }
  const hashed = await bcrypt.hash(password, 10);

  const user = new User({
    id: id,
    password: hashed,
    permissions: role,
  });

  await user.save();
  console.log(`✅ 測試帳號 ${id} 建立完成，密碼為 ${password}`);
  process.exit();
}

module.exports = globalSetup;
