require('dotenv').config();
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 使用者登入
 *     description: 提供帳號密碼，回傳 JWT token 與角色
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
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
  const { id, password } = req.body;
  const user = await User.findOne({ id });

  if (!user) return res.status(401).json({ message: 'User Not Found' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Password Error' });

  const token = jwt.sign({ id: user.id, role: user.permissions }, SECRET, { expiresIn: '1h' });

  res.json({ token, role: user.permissions, message: 'Login Successful!' });
});

module.exports = router;