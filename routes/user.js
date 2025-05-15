const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");

/**
 * @swagger
 * tags:
 *   name: User
 *   description: 使用者管理 API
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: 建立使用者
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *               - password
 *               - userRole
 *             properties:
 *               userName:
 *                 type: string
 *                 example: worker001
 *               password:
 *                 type: string
 *                 example: 123456
 *               userRole:
 *                 type: string
 *                 enum: [admin, leader, worker]
 *                 example: worker
 *     responses:
 *       201:
 *         description: 使用者建立成功
 *       400:
 *         description: 資料格式錯誤或重複
 */
router.post("/", async (req, res) => {
  try {
    const { userName, password, userRole } = req.body;
    if (!userName || !password || !userRole) {
      return res.status(400).json({ error: "userName、password、userRole 為必填" });
    }

    const exist = await User.findOne({ userName });
    if (exist) return res.status(400).json({ error: "userName 已存在" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ userName, passwordValidate: hashed, userRole });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 取得所有使用者
 *     tags: [User]
 *     responses:
 *       200:
 *         description: 使用者列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   userName:
 *                     type: string
 *                   userRole:
 *                     type: string
 *                   createdAt:
 *                     type: string
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: 更新使用者資料（名稱或角色）
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               userRole:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 找不到使用者
 */
router.put("/:id", async (req, res) => {
  try {
    const { userName, userRole } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { userName, userRole },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "找不到使用者" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: 刪除使用者
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 刪除成功
 *       404:
 *         description: 找不到使用者
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "找不到使用者" });
    res.json({ message: "刪除成功", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
