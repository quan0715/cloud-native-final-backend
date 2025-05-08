require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI;

function initUser({ id, password, role }) {
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
}

initUser({ id: "admin001", password: "123456", role: "admin" });
initUser({ id: "leader001", password: "123456", role: "leader" });
initUser({ id: "worker001", password: "123456", role: "worker" });
