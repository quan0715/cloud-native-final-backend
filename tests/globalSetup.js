import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcrypt';

export default async function globalSetup() {
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();
  global.__MONGOINSTANCE = instance;

  process.env.MONGODB_URI = uri + 'mini-lab'
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  await conn.connection.db.dropDatabase();
  await setupDB();
  await mongoose.disconnect();
};

async function setupDB() {
  await initUser({ userName: "admin001", password: "123456", userRole: "admin" });
  await initUser({ userName: "leader001", password: "123456", userRole: "leader" });
  await initUser({ userName: "worker001", password: "123456", userRole: "worker" });
}

async function initUser({ userName, password, userRole }) {
  const exist = await User.findOne({ userName });
  if (exist) {
    console.log(`⚠️ 帳號 ${userName} 已存在，略過建立`);
    return;
  }
  
  const hashed = await bcrypt.hash(password, 10);

  const user = new User({
    userName: userName,
    passwordValidate: hashed,
    userRole: userRole,
  });

  await user.save();
  console.log(`✅ 測試帳號 ${userName} 建立完成，密碼為 ${password}`);
}