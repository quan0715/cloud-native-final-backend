const express = require("express");
const router = express.Router();
const Machine = require("../models/Machine");

/**
 * @swagger
 * tags:
 *   name: Machine
 *   description: 機器管理 API
 */

/**
 * @swagger
 * /machines:
 *   post:
 *     summary: 新增機器
 *     tags: [Machine]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - machineName
 *             properties:
 *               machineName:
 *                 type: string
 *                 example: GPU-01
 *               machine_task_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["6643f6..."]
 *     responses:
 *       201:
 *         description: 建立成功
 *       400:
 *         description: 格式錯誤或重複
 */
router.post("/", async (req, res) => {
  try {
    const { machineName, machine_task_types } = req.body;
    if (!machineName) return res.status(400).json({ error: "machineName 為必填" });

    const exist = await Machine.findOne({ machineName });
    if (exist) return res.status(400).json({ error: "machineName 已存在" });

    const machine = new Machine({ machineName, machine_task_types });
    await machine.save();

    res.status(201).json(machine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /machines:
 *   get:
 *     summary: 取得所有機器
 *     tags: [Machine]
 *     responses:
 *       200:
 *         description: 機器列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "6643f6..."
 *                   machineName:
 *                     type: string
 *                     example: "GPU-01"
 *                   machine_task_types:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["6643f6a..."]
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/", async (req, res) => {
  try {
    const machines = await Machine.find().populate("machine_task_types");
    res.json(machines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /machines/{id}:
 *   get:
 *     summary: 取得單一機器
 *     tags: [Machine]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功取得
 *       404:
 *         description: 找不到該機器
 */
router.get("/:id", async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id).populate("machine_task_types");
    if (!machine) return res.status(404).json({ error: "找不到該機器" });
    res.json(machine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /machines/{id}:
 *   put:
 *     summary: 更新機器資訊
 *     tags: [Machine]
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
 *               machineName:
 *                 type: string
 *               machine_task_types:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 找不到
 */
router.put("/:id", async (req, res) => {
  try {
    const { machineName, machine_task_types } = req.body;
    const updated = await Machine.findByIdAndUpdate(
      req.params.id,
      { machineName, machine_task_types },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "找不到該機器" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /machines/{id}:
 *   delete:
 *     summary: 刪除機器
 *     tags: [Machine]
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
 *         description: 找不到該機器
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Machine.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "找不到該機器" });
    res.json({ message: "刪除成功", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
