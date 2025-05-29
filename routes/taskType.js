const express = require("express");
const router = express.Router();
const TaskType = require("../models/TaskType");

/**
 * @swagger
 * tags:
 *   name: TaskType
 *   description: Task Type 相關 API
 */

/**
 * @swagger
 * /task-types:
 *   post:
 *     summary: 建立 Task Type
 *     tags: [TaskType]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskName
 *               - number_of_machine
 *             properties:
 *               taskName:
 *                 type: string
 *                 example: 電性測試
 *               number_of_machine:
 *                 type: integer
 *                 example: 2
 *               color:
 *                 type: string
 *                 example: "#FF5733"
 *     responses:
 *       201:
 *         description: Task Type 建立成功
 *       400:
 *         description: 請求錯誤或 taskName 已存在
 */
router.post("/", async (req, res) => {
  try {
    const { taskName, number_of_machine, color } = req.body;

    if (!taskName || typeof number_of_machine !== "number") {
      return res.status(400).json({ error: "taskName 與 number_of_machine 為必填" });
    }

    const exist = await TaskType.findOne({ taskName });
    if (exist) return res.status(400).json({ error: "taskName 已存在" });

    const taskType = new TaskType({
      taskName,
      number_of_machine,
      ...(color && { color })
    });

    await taskType.save();
    res.status(201).json(taskType);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /task-types:
 *   get:
 *     summary: 取得所有 Task Type
 *     tags: [TaskType]
 *     responses:
 *       200:
 *         description: Task Type 列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: MongoDB 自動產生的 ID
 *                     example: "6643f6a920eee2d3e9c84321"
 *                   taskName:
 *                     type: string
 *                     description: 任務類型名稱
 *                     example: 溫度測試
 *                   number_of_machine:
 *                     type: integer
 *                     description: 所需機器數量
 *                     example: 2
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-05-13T12:34:56.000Z"
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-05-13T12:34:56.000Z"
 */
router.get("/", async (req, res) => {
  try {
    const types = await TaskType.find();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /task-types/{id}:
 *   delete:
 *     summary: 刪除指定 Task Type
 *     tags: [TaskType]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: TaskType 的 MongoDB ID
 *     responses:
 *       200:
 *         description: 刪除成功
 *       404:
 *         description: Task Type 不存在
 */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await TaskType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "TaskType 不存在" });
    res.json({ message: "刪除成功", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /task-types/{id}:
 *   put:
 *     summary: 更新 Task Type
 *     tags: [TaskType]
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
 *               taskName:
 *                 type: string
 *                 example: 電性測試
 *               number_of_machine:
 *                 type: integer
 *                 example: 2
 *               color:
 *                 type: string
 *                 example: "#FF5733"
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 taskName:
 *                   type: string
 *                 number_of_machine:
 *                   type: integer
 *                 color:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Task Type 不存在
 */
router.put("/:id", async (req, res) => {
  try {
    const { taskName, number_of_machine, color } = req.body;

    const updateFields = {};
    if (taskName !== undefined) updateFields.taskName = taskName;
    if (number_of_machine !== undefined) updateFields.number_of_machine = number_of_machine;
    if (color !== undefined) updateFields.color = color;

    const updated = await TaskType.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: "TaskType 不存在" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;