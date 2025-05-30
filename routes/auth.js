require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { metrics } = require('../metrics');

const SECRET = process.env.JWT_SECRET;

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 使用者登入
 *     description: 提供 userName 和密碼，回傳 JWT token 與角色
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 example: admin001
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: 登入成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 role:
 *                   type: string
 *                   example: admin
 *                 message:
 *                   type: string
 *                   example: Login Successful!
 *       401:
 *         description: 帳號或密碼錯誤
 */
router.post('/login', async (req, res) => {
  const { userName, password } = req.body;
  const { appUserLoginsTotal, appUserLoginFailuresTotal } = metrics;

  try {
    const user = await User.findOne({ userName });
    if (!user) {
      appUserLoginFailuresTotal.inc({ reason: 'user_not_found' });
      return res.status(401).json({ message: 'User Not Found' });
    }

    const valid = await bcrypt.compare(password, user.passwordValidate);
    if (!valid) {
      appUserLoginFailuresTotal.inc({ reason: 'password_error' });
      return res.status(401).json({ message: 'Password Error' });
    }

    const token = jwt.sign({ id: user._id, role: user.userRole }, SECRET, { expiresIn: '1h' });
    appUserLoginsTotal.inc({ role: user.userRole });
    res.json({ token, role: user.userRole, message: 'Login Successful!' });
  } catch (error) {
    appUserLoginFailuresTotal.inc({ reason: 'server_error' }); 
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;