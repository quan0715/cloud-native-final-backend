const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const TaskType = require("../models/TaskType");

/**
 * @swagger
 * tags:
 *   name: Task
 *   description: 任務管理 API
 */

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: 建立新的任務
 *     tags: [Task]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskTypeId
 *               - taskName
 *             properties:
 *               taskTypeId:
 *                 type: string
 *                 example: 6649b2aef5a3c3dc7f9e1234
 *               taskName:
 *                 type: string
 *                 example: 電性測試-001
 *     responses:
 *       201:
 *         description: 任務建立成功，回傳任務資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: 665d2f7a7a1234567890abcd
 *                 taskTypeId:
 *                   type: string
 *                   example: 6649b2aef5a3c3dc7f9e1234
 *                 taskName:
 *                   type: string
 *                   example: 電性測試-001
 *                 assigner_id:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 taskData:
 *                   type: object
 *                   properties:
 *                     state:
 *                       type: string
 *                       enum: [draft, assigned, in-progress, success, fail]
 *                       example: draft
 *                     assignee_id:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     machine:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                     assignTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     message:
 *                       type: string
 *                       example: ""
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-05-16T13:10:00.000Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-05-16T13:10:00.000Z"
 *       400:
 *         description: 請求格式錯誤或 taskTypeId 不存在
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: taskTypeId 不存在
 *       500:
 *         description: 伺服器錯誤
 */
router.post("/", async (req, res) => {
    try {
      const { taskTypeId, taskName } = req.body;
  
      if (!taskTypeId || !taskName) {
        return res.status(400).json({ error: "taskTypeId 與 taskName 為必填" });
      }
  
      const taskType = await TaskType.findById(taskTypeId);
      if (!taskType) {
        return res.status(400).json({ error: "taskTypeId 不存在" });
      }
  
      const task = new Task({
        taskTypeId,
        taskName,
        assigner_id: null,
        taskData: {
          state: "draft",
          assignee_id: null,
          machine: [],
          assignTime: null,
          startTime: null,
          endTime: null,
          message: ""
        }
      });
  
      await task.save();
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: 取得所有任務（含任務類型、機器、指派者與執行者）
 *     tags: [Task]
 *     responses:
 *       200:
 *         description: 任務列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "665a1f..."
 *                   taskName:
 *                     type: string
 *                     example: "電性測試-001"
 *                   taskTypeId:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "664b1c..."
 *                       taskName:
 *                         type: string
 *                         example: "電性測試"
 *                       number_of_machine:
 *                         type: integer
 *                         example: 2
 *                   assigner_id:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       _id:
 *                         type: string
 *                       userName:
 *                         type: string
 *                   taskData:
 *                     type: object
 *                     properties:
 *                       state:
 *                         type: string
 *                         enum: [draft, assigned, in-progress, success, fail]
 *                         example: assigned
 *                       assignee_id:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           _id:
 *                             type: string
 *                           userName:
 *                             type: string
 *                       machine:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             machineName:
 *                               type: string
 *                       assignTime:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       message:
 *                         type: string
 *                         example: ""
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/", async (req, res) => {
    try {
      const tasks = await Task.find()
        .populate("taskTypeId")
        .populate("assigner_id", "userName")
        .populate("taskData.assignee_id", "userName")
        .populate("taskData.machine", "machineName");
  
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

/**
 * @swagger
 * /tasks/{id}/complete:
 *   patch:
 *     summary: 完成任務，更新狀態為 success，並可附加訊息
 *     tags: [Task]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 任務 ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: 測試完成，數據正常
 *     responses:
 *       200:
 *         description: 任務完成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 任務已成功完成
 *                 task:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     taskName:
 *                       type: string
 *                     taskData:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                         endTime:
 *                           type: string
 *                           format: date-time
 *                         message:
 *                           type: string
 *       400:
 *         description: 任務不是進行中，無法完成
 *       404:
 *         description: 找不到任務
 */
router.patch("/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
  
      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ error: "找不到任務" });
  
      if (task.taskData.state !== "in-progress") {
        return res.status(400).json({ error: "任務當前狀態不是 in-progress，無法完成" });
      }
  
      task.taskData.state = "success";
      task.taskData.endTime = new Date();
  
      if (message !== undefined) {
        task.taskData.message = message;
      }
  
      await task.save();
  
      res.json({ message: "任務已成功完成", task });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

/**
 * @swagger
 * /tasks/{id}/fail:
 *   patch:
 *     summary: 標記任務失敗，更新狀態為 fail 並可附加訊息
 *     tags: [Task]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 任務 ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: 測試過程異常，自動關機
 *     responses:
 *       200:
 *         description: 任務已標記為失敗
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 任務已標記為失敗
 *                 task:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     taskName:
 *                       type: string
 *                     taskData:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                           example: fail
 *                         endTime:
 *                           type: string
 *                           format: date-time
 *                         message:
 *                           type: string
 *       400:
 *         description: 任務不是進行中，無法標記為失敗
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 任務當前狀態不是 in-progress，無法標記為失敗
 *       404:
 *         description: 找不到任務
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 找不到任務
 */
router.patch("/:id/fail", async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
  
      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ error: "找不到任務" });
  
      if (task.taskData.state !== "in-progress") {
        return res.status(400).json({ error: "任務當前狀態不是 in-progress，無法標記為失敗" });
      }
  
      task.taskData.state = "fail";
      task.taskData.endTime = new Date();
  
      if (message !== undefined) {
        task.taskData.message = message;
      }
  
      await task.save();
  
      res.json({ message: "任務已標記為失敗", task });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

module.exports = router;