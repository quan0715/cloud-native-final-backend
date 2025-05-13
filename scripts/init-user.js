require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI;

function initUser({ userName, password, userRole }) {
  mongoose.connect(MONGODB_URI).then(async () => {
    const exist = await User.findOne({ userName });
    if (exist) {
      console.log(`⚠️ 帳號 ${userName} 已存在，略過建立`);
      process.exit();
    }
    
    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      userName: userName,
      passwordValidate: hashed,
      userRole: userRole,
    });

    await user.save();
    console.log(`✅ 測試帳號 ${userName} 建立完成，密碼為 ${password}`);
    process.exit();
  });
}

initUser({ userName: "admin001", password: "123456", userRole: "admin" });
initUser({ userName: "leader001", password: "123456", userRole: "leader" });
initUser({ userName: "worker001", password: "123456", userRole: "worker" });