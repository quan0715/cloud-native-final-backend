require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

MONGODB_URI = "mongodb://127.0.0.1:27017/mini-lab";
const id = "leader001";
const password = "123456";
const role = "leader";
mongoose.connect(MONGODB_URI).then(async () => {
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
});
