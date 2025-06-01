const express = require("express");
const router = express.Router();
const Machine = require("../models/Machine");
const Task = require("../models/Task");
const TaskType = require("../models/TaskType");
const { metrics } = require('../metrics');

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
 *     summary: 新增機器（需驗證 taskType 是否存在）
 *     tags: [Machine]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - machineName
 *               - machine_task_types
 *             properties:
 *               machineName:
 *                 type: string
 *                 description: 機器名稱（不可重複）
 *                 example: GGIT-01
 *               machine_task_types:
 *                 type: array
 *                 description: 支援此機器的任務類型 ID 陣列
 *                 items:
 *                   type: string
 *                 example: ["6643f6eacb1234567890abcd", "6643f6eacb1234567890abce"]
 *     responses:
 *       201:
 *         description: 機器建立成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "665d1fabc1234567890abcd1"
 *                 machineName:
 *                   type: string
 *                   example: "GGIT-01"
 *                 machine_task_types:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["6643f6eacb1234567890abcd", "6643f6eacb1234567890abce"]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: 請求格式錯誤、機器名稱重複或 taskTypeId 無效
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "machineName 已存在"
 *       500:
 *         description: 伺服器內部錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
router.post("/", async (req, res) => {
  const { appMachineOperationsTotal } = metrics;
  try {
    const { machineName, machine_task_types } = req.body;

    if (!machineName || !Array.isArray(machine_task_types)) {
      return res.status(400).json({ error: "machineName 與 machine_task_types 為必填" });
    }

    const exist = await Machine.findOne({ machineName });
    if (exist) return res.status(400).json({ error: "machineName 已存在" });

    // 確認每個 taskTypeId 都存在
    const validTaskTypes = await TaskType.find({
      _id: { $in: machine_task_types }
    });

    if (validTaskTypes.length !== machine_task_types.length) {
      return res.status(400).json({ error: "部分 taskTypeId 不存在" });
    }

    const machine = new Machine({ machineName, machine_task_types });
    await machine.save();
    appMachineOperationsTotal.inc({ operation: 'create' });
    res.status(201).json(machine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /machines:
 *   get:
 *     summary: 取得所有機器（含動態狀態）
 *     tags: [Machine]
 *     responses:
 *       200:
 *         description: 機器列表（含 in-use 或 idle 狀態）
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
 *                     example: "GGIT-01"
 *                   machine_task_types:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         taskName:
 *                           type: string
 *                         number_of_machine:
 *                           type: integer
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt: 
 *                           type: string
 *                           format: date-time
 *                   status:
 *                     type: string
 *                     enum: [in-use, idle]
 *                     example: "in-use"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/", async (req, res) => {
  try {
    // 查出所有 in-progress 任務中使用的機器
    const inProgressTasks = await Task.find({ "taskData.state": "in-progress" });

    const usedMachineIds = new Set();
    for (const task of inProgressTasks) {
      for (const m of task.taskData.machine) {
        usedMachineIds.add(m.toString());
      }
    }

    // 撈出所有機器並標註狀態
    const machines = await Machine.find().populate("machine_task_types");

    const machinesWithStatus = machines.map(m => {
      const mObj = m.toObject();
      mObj.status = usedMachineIds.has(m._id.toString()) ? "in-use" : "idle";
      return mObj;
    });

    res.json(machinesWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /machines/{id}:
 *   get:
 *     summary: 取得單一機器（包含動態狀態）
 *     tags: [Machine]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 機器的 MongoDB _id
 *     responses:
 *       200:
 *         description: 成功取得機器資訊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "6643f6..."
 *                 machineName:
 *                   type: string
 *                   example: "GGIT-01"
 *                 machine_task_types:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       taskName:
 *                         type: string
 *                       number_of_machine:
 *                         type: integer
 *                       createdAt: 
 *                         type: string
 *                         format: date-time
 *                       updatedAt: 
 *                         type: string
 *                         format: date-time
 *                 status:
 *                   type: string
 *                   enum: [in-use, idle]
 *                   example: "idle"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: 找不到該機器
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "找不到該機器"
 */
router.get("/:id", async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id).populate("machine_task_types");
    if (!machine) return res.status(404).json({ error: "找不到該機器" });

    // 檢查是否有 in-progress 任務包含這台機器
    const inUse = await Task.exists({
      "taskData.state": "in-progress",
      "taskData.machine": machine._id
    });

    const machineWithStatus = {
      ...machine.toObject(),
      status: inUse ? "in-use" : "idle"
    };

    res.json(machineWithStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /machines/{id}:
 *   put:
 *     summary: 更新機器資訊（驗證 taskType 是否存在）
 *     tags: [Machine]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 要更新的機器 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               machineName:
 *                 type: string
 *                 example: GGIT-01
 *               machine_task_types:
 *                 type: array
 *                 description: 指定支援的任務類型 ID 陣列
 *                 items:
 *                   type: string
 *                 example: ["6643f6eacb1234567890abcd", "6643f6eacb1234567890abce"]
 *     responses:
 *       200:
 *         description: 更新成功，回傳更新後的機器資訊（包含 taskType 詳細資料與時間戳記）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "665d1fabc1234567890abcd1"
 *                 machineName:
 *                   type: string
 *                   example: "GGIT-01"
 *                 machine_task_types:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "6643f6eacb1234567890abcd"
 *                       taskName:
 *                         type: string
 *                         example: "電性測試"
 *                       number_of_machine:
 *                         type: integer
 *                         example: 2
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-05-15T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-05-15T10:35:00.000Z"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-05-14T08:00:00.000Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-05-15T10:35:00.000Z"
 *       400:
 *         description: 格式錯誤或 taskTypeId 不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "部分 taskTypeId 不存在"
 *       404:
 *         description: 找不到該機器
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "找不到該機器"
 *       500:
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
router.put("/:id", async (req, res) => {
  const { appMachineOperationsTotal } = metrics;
  try {
    const { machineName, machine_task_types } = req.body;

    if (!Array.isArray(machine_task_types)) {
      return res.status(400).json({ error: "machine_task_types 必須是陣列" });
    }

    // 驗證所有 taskType 是否存在
    const validTaskTypes = await TaskType.find({
      _id: { $in: machine_task_types }
    });

    if (validTaskTypes.length !== machine_task_types.length) {
      return res.status(400).json({ error: "部分 taskTypeId 不存在" });
    }

    const updated = await Machine.findByIdAndUpdate(
      req.params.id,
      { machineName, machine_task_types },
      { new: true, runValidators: true }
    ).populate("machine_task_types");

    if (!updated) return res.status(404).json({ error: "找不到該機器" });
    appMachineOperationsTotal.inc({ operation: 'update' });
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
 *         description: 要刪除的機器 ID
 *     responses:
 *       200:
 *         description: 刪除成功，回傳已刪除的機器資訊（簡略）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 刪除成功
 *                 deleted:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "682622883be746da136c4b4c"
 *                     machineName:
 *                       type: string
 *                       example: "GGIT-01"
 *                     machine_task_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["68254e33980e246d37af00b9"]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     __v:
 *                       type: integer
 *                       example: 0
 *       404:
 *         description: 找不到該機器
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 找不到該機器
 *       500:
 *         description: 伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal Server Error
 */
router.delete("/:id", async (req, res) => {
  const { appMachineOperationsTotal } = metrics;
  try {
    const deleted = await Machine.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "找不到該機器" });
    appMachineOperationsTotal.inc({ operation: 'delete' });
    res.json({ message: "刪除成功", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
