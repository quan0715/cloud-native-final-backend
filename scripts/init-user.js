require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

MONGODB_URI="mongodb://localhost:27017/mini-lab"
mongoose.connect(MONGODB_URI).then(async () => {

  const exist = await User.findOne({ id: 'admin001' });
  if (exist) {
    console.log('⚠️ 帳號 admin001 已存在，略過建立');
    process.exit();
  }
  const hashed = await bcrypt.hash('123456', 10);

  const user = new User({
    id: 'admin001',
    password: hashed,
    permissions: 'admin',
  });

  await user.save();
  console.log('✅ 測試帳號 admin001 建立完成，密碼為 123456');
  process.exit();
});
