const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const TaskType = require("../models/TaskType");
const User = require("../models/User");
const Machine = require('../models/Machine'); 

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

/**
 * @swagger
 * /tasks/auto-assign-preview:
 *   post:
 *     summary: 預覽自動指派所有 draft 任務的執行者
 *     description: 根據每位 worker 的技能與目前負載預測指派對象，不會實際修改資料庫
 *     tags: [Task]
 *     responses:
 *       200:
 *         description: 回傳每筆 draft 任務預測會分配給哪位 worker
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   taskId:
 *                     type: string
 *                     example: "665f1abc1234567890abc123"
 *                   taskName:
 *                     type: string
 *                     example: "電性測試-001"
 *                   previewAssignee:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "664b2a9e5f3c3dc7f9e45678"
 *                       userName:
 *                         type: string
 *                         example: "worker001"
 *       500:
 *         description: 預覽過程發生伺服器錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 預覽任務指派失敗
 */
router.post('/auto-assign-preview', async (req, res) => {
  try {
    const draftTasks = await Task.find({ 'taskData.state': 'draft' });
    const workers = await User.find({ userRole: 'worker' });

    // 取得所有目前已被指派的任務（assigned + in-progress）
    const activeTasks = await Task.find({
      'taskData.state': { $in: ['assigned', 'in-progress'] }
    });

    // 建立一個 workerId -> 預計新增任務數 的 Map
    const simulatedLoadMap = new Map();
    workers.forEach(w => simulatedLoadMap.set(String(w._id), 0));

    const previewList = [];

    for (const task of draftTasks) {
      const taskTypeId = String(task.taskTypeId);

      // 篩選具備該任務技能的 worker
      const eligibleWorkers = workers.filter(worker =>
        worker.user_task_types.map(String).includes(taskTypeId)
      );

      if (eligibleWorkers.length === 0) continue;

      // 對每位候選 worker 建立負載資訊
      const workerLoadMap = eligibleWorkers.map(worker => {
        const idStr = String(worker._id);

        const actualLoad = activeTasks.filter(t =>
          String(t.taskData.assignee_id) === idStr
        ).length;

        const simulatedLoad = simulatedLoadMap.get(idStr) || 0;

        return {
          worker,
          load: actualLoad + simulatedLoad,
          isSpecialist: worker.user_task_types.length === 1
        };
      });

      // 排序規則：技能越單一越優先 → 總負載越少越優先
      workerLoadMap.sort((a, b) => {
        if (a.load !== b.load) {
          return a.load - b.load; // 負載越少越前面
        }
        // 如果負載相同，再比較技能單一性
        if (a.isSpecialist && !b.isSpecialist) return -1;
        if (!a.isSpecialist && b.isSpecialist) return 1;
        return 0;
      });

      const selected = workerLoadMap[0];
      const selectedIdStr = String(selected.worker._id);

      // 模擬新增任務負載
      simulatedLoadMap.set(
        selectedIdStr,
        simulatedLoadMap.get(selectedIdStr) + 1
      );

      // 加入 preview 結果
      previewList.push({
        taskId: task._id,
        taskName: task.taskName,
        previewAssignee: {
          _id: selected.worker._id,
          userName: selected.worker.userName
        }
      });
    }

    res.json(previewList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '預覽任務指派失敗' });
  }
});

/**
 * @swagger
 * /tasks/auto-assign-confirm:
 *   patch:
 *     summary: 確認預覽結果並實際指派 draft 任務（含 assigner）
 *     tags: [Task]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignerId
 *               - assignments
 *             properties:
 *               assignerId:
 *                 type: string
 *                 example: "664cdef1234567890abcdef0"
 *               assignments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - taskId
 *                     - assigneeId
 *                   properties:
 *                     taskId:
 *                       type: string
 *                     assigneeId:
 *                       type: string
 *     responses:
 *       200:
 *         description: 指派成功
 *       400:
 *         description: 請求格式錯誤
 *       500:
 *         description: 伺服器錯誤
 */
router.patch('/auto-assign-confirm', async (req, res) => {
  try {
    const { assignerId, assignments } = req.body;

    if (!assignerId || !Array.isArray(assignments)) {
      return res.status(400).json({ error: '請提供 assignerId 與 assignments 陣列' });
    }

    const results = [];

    for (const { taskId, assigneeId } of assignments) {
      const task = await Task.findById(taskId);
      if (!task || task.taskData.state !== 'draft') {
        results.push({ taskId, status: 'skipped', reason: '任務不存在或非 draft 狀態' });
        continue;
      }

      task.assigner_id = assignerId;
      task.taskData.assignee_id = assigneeId;
      task.taskData.state = 'assigned';
      task.taskData.assignTime = new Date();
      await task.save();

      results.push({ taskId, status: 'assigned', assigneeId });
    }

    res.json({ message: '任務指派完成', results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '指派過程發生錯誤' });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: 刪除任務（僅限 draft 狀態）
 *     tags: [Task]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 任務 ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 任務刪除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 任務已刪除
 *       400:
 *         description: 任務不是 draft 狀態，無法刪除
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 只能刪除 draft 狀態的任務
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ error: '找不到任務' });
    }

    if (task.taskData.state !== 'draft') {
      return res.status(400).json({ error: '只能刪除 draft 狀態的任務' });
    }

    await Task.findByIdAndDelete(id);
    res.json({ message: '任務已刪除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '刪除任務時發生錯誤' });
  }
});

/**
 * @swagger
 * /tasks/start-next:
 *   patch:
 *     summary: 自動啟動 worker 的下一個可執行任務（分配可用機器）
 *     tags: [Task]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workerId
 *             properties:
 *               workerId:
 *                 type: string
 *                 example: "664b2a9e5f3c3dc7f9e45678"
 *     responses:
 *       200:
 *         description: 任務啟動成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 任務已成功啟動
 *                 task:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "665f1abc1234567890abc123"
 *                     taskName:
 *                       type: string
 *                       example: "電性測試-001"
 *                     taskTypeId:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "6649b2aef5a3c3dc7f9e1234"
 *                         taskName:
 *                           type: string
 *                           example: "電性測試"
 *                         number_of_machine:
 *                           type: integer
 *                           example: 2
 *                     assigner_id:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         _id:
 *                           type: string
 *                         userName:
 *                           type: string
 *                     taskData:
 *                       type: object
 *                       properties:
 *                         state:
 *                           type: string
 *                           enum: [draft, assigned, in-progress, success, fail]
 *                           example: in-progress
 *                         assignee_id:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                             userName:
 *                               type: string
 *                         machine:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               machineName:
 *                                 type: string
 *                         assignTime:
 *                           type: string
 *                           format: date-time
 *                         startTime:
 *                           type: string
 *                           format: date-time
 *                         endTime:
 *                           type: string
 *                           format: date-time
 *                         message:
 *                           type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 無可啟動任務或機器不足
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 目前無可啟動的任務（機器不足）
 *       500:
 *         description: 系統錯誤
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 啟動任務時發生錯誤
 */
router.patch('/start-next', async (req, res) => {
  try {
    const { workerId } = req.body;
    if (!workerId) {
      return res.status(400).json({ error: '請提供 workerId' });
    }

    const assignedTasks = await Task.find({
      'taskData.state': 'assigned',
      'taskData.assignee_id': workerId
    }).populate('taskTypeId');

    if (assignedTasks.length === 0) {
      return res.status(400).json({ error: '目前沒有可啟動的任務' });
    }

    // 依照需要機器數量做降冪排序（多的先做）
    assignedTasks.sort((a, b) =>
      b.taskTypeId.number_of_machine - a.taskTypeId.number_of_machine
    );

    const usedMachineIds = await Task.find({ 'taskData.state': 'in-progress' })
      .distinct('taskData.machine');

    for (const task of assignedTasks) {
      const requiredMachineCount = task.taskTypeId.number_of_machine;

      const availableMachines = await Machine.find({
        _id: { $nin: usedMachineIds },
        machine_task_types: task.taskTypeId._id
      }).limit(requiredMachineCount);

      if (availableMachines.length >= requiredMachineCount) {
        task.taskData.machine = availableMachines.map(m => m._id);
        task.taskData.state = 'in-progress';
        task.taskData.startTime = new Date();
        await task.save();

        return res.status(200).json({
          message: '任務已成功啟動',
          task
        });
      }
    }

    return res.status(400).json({ error: '目前無可啟動的任務（機器不足）' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '啟動任務時發生錯誤' });
  }
});

module.exports = router;