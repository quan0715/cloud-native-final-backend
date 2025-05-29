const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Task = require("../models/Task");
const TaskType = require("../models/TaskType");
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "682632f9431fd350c9da1159"
 *                 userName:
 *                   type: string
 *                   example: "worker001"
 *                 userRole:
 *                   type: string
 *                   enum: [admin, leader, worker]
 *                   example: "worker"
 *                 passwordValidate:
 *                   type: string
 *                   example: "$2b$10$HNC7QHNSEmY7gvmLh/ZmB.EuPmg5br22QCT4LdV56j2A6zrIyhLMS"
 *                 user_task_types:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: []
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-05-15T18:31:21.793Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-05-15T18:31:21.793Z"
 *       400:
 *         description: 資料格式錯誤或 userName 重複
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "userName 已存在"
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
 *     summary: 取得所有使用者（包含技能 user_task_types）
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
 *                     example: "665c123..."
 *                   passwordValidate:
 *                     type: string
 *                     example: "$2b$10$xnN2htYqGm1rm7f2X4kBfusl3/O2hXRIkxQkUyb3xnoSvSCvxYiMu"
 *                   userName:
 *                     type: string
 *                     example: "worker001"
 *                   userRole:
 *                     type: string
 *                     enum: [admin, leader, worker]
 *                     example: "worker"
 *                   user_task_types:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "664b1c..."
 *                         taskName:
 *                           type: string
 *                           example: "電性測試"
 *                         number_of_machine:
 *                           type: integer
 *                           example: 2
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 */
router.get("/", async (req, res) => {
    try {
      const users = await User.find().populate("user_task_types");
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /users/with-tasks:
 *   get:
 *     summary: 取得所有使用者與其相關任務（assigned / in-progress / success）
 *     tags: [User]
 *     responses:
 *       200:
 *         description: 使用者與任務資料
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "664c1f..."
 *                   userName:
 *                     type: string
 *                     example: "User1"
 *                   userRole:
 *                     type: string
 *                     enum: [admin, leader, worker]
 *                     example: "worker"
 *                   user_task_types:
 *                    type: array
 *                    items:
 *                     type: object
 *                     properties:
 *                      _id:
 *                        type: string
 *                        example: "664b1c123456abcdef7890"
 *                      taskName:
 *                        type: string
 *                        example: "電性測試"
 *                      number_of_machine:
 *                        type: integer
 *                        example: 2
 *                     color:
 *                        type: string
 *                        example: "#FF5733"
 *                   assignedTasks:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "taskId123"
 *                         taskName:
 *                           type: string
 *                           example: "XD12345"
 *                         state:
 *                           type: string
 *                           enum: [assigned, in-progress, success]
 *                           example: "assigned"
 *                         taskType:
 *                           type: object
 *                           properties:
 *                             taskName:
 *                               type: string
 *                               example: "溫度測試"
 *                         machine:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               machineName:
 *                                 type: string
 *                                 example: "Machine1"
 *                   inProgressTasks:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "taskId567"
 *                         taskName:
 *                           type: string
 *                           example: "XD67890"
 *                         state:
 *                           type: string
 *                           example: "in-progress"
 *                         taskType:
 *                           type: object
 *                           properties:
 *                             taskName:
 *                               type: string
 *                               example: "溫度測試"
 *                         machine:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               machineName:
 *                                 type: string
 *                                 example: "Machine2"
 *                   completedTasks:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         taskName:
 *                           type: string
 *                         state:
 *                           type: string
 *                           example: "success"
 */
router.get("/with-tasks", async (req, res) => {
    try {
      const users = await User.find({ userRole: "worker" })
        .populate("user_task_types")
        .lean();
  
      const tasks = await Task.find({
        "taskData.assignee_id": { $ne: null },
        "taskData.state": { $in: ["assigned", "in-progress", "success"] }
      })
        .populate("taskTypeId")
        .populate("taskData.machine")
        .lean();
  
      const userTaskMap = {};
  
      for (const task of tasks) {
        const userId = task.taskData.assignee_id.toString();
        if (!userTaskMap[userId]) {
          userTaskMap[userId] = {
            assignedTasks: [],
            inProgressTasks: [],
            completedTasks: []
          };
        }
  
        const simplifiedTask = {
          _id: task._id,
          taskName: task.taskName,
          state: task.taskData.state,
          taskType: task.taskTypeId ? { taskName: task.taskTypeId.taskName } : null,
          machine: task.taskData.machine.map(m => ({ machineName: m.machineName }))
        };
  
        if (task.taskData.state === "assigned") {
          userTaskMap[userId].assignedTasks.push(simplifiedTask);
        } else if (task.taskData.state === "in-progress") {
          userTaskMap[userId].inProgressTasks.push(simplifiedTask);
        } else if (task.taskData.state === "success") {
          userTaskMap[userId].completedTasks.push(simplifiedTask);
        }
      }
  
      const result = users.map(user => {
        const taskInfo = userTaskMap[user._id.toString()] || {
          assignedTasks: [],
          inProgressTasks: [],
          completedTasks: []
        };
        return {
          _id: user._id,
          userName: user.userName,
          userRole: user.userRole,
          user_task_types: user.user_task_types,
          ...taskInfo
        };
      });
  
      res.json(result);
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
 *         description: 使用者的 MongoDB _id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 example: "worker001"
 *               userRole:
 *                 type: string
 *                 enum: [admin, leader, worker]
 *                 example: "worker"
 *     responses:
 *       200:
 *         description: 更新成功，回傳使用者資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "682632f9431fd350c9da1159"
 *                 userName:
 *                   type: string
 *                   example: "worker001"
 *                 userRole:
 *                   type: string
 *                   enum: [admin, leader, worker]
 *                   example: "worker"
 *                 passwordValidate:
 *                   type: string
 *                   example: "$2b$10$hashedPasswordHere"
 *                 user_task_types:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: []
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-05-15T18:31:21.793Z"
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-05-15T19:01:10.123Z"
 *       404:
 *         description: 找不到使用者
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "找不到使用者"
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
 *         description: 要刪除的使用者 ID
 *     responses:
 *       200:
 *         description: 刪除成功，回傳被刪除的使用者資訊
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
 *                       example: "682632f9431fd350c9da1159"
 *                     userName:
 *                       type: string
 *                       example: "worker001"
 *                     userRole:
 *                       type: string
 *                       enum: [admin, leader, worker]
 *                       example: "worker"
 *                     passwordValidate:
 *                       type: string
 *                       example: "$2b$10$hashedPasswordHere"
 *                     user_task_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-15T18:31:21.793Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-15T19:10:00.000Z"
 *       404:
 *         description: 找不到使用者
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 找不到使用者
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
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "找不到使用者" });
    res.json({ message: "刪除成功", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /users/{id}/add-task-type:
 *   post:
 *     summary: 為指定使用者新增技能（taskType）
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 使用者 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskTypeId
 *             properties:
 *               taskTypeId:
 *                 type: string
 *                 example: "664b1c..."
 *     responses:
 *       200:
 *         description: 技能新增成功，回傳使用者資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 技能新增成功
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "682632f9431fd350c9da1159"
 *                     userName:
 *                       type: string
 *                       example: "worker001"
 *                     userRole:
 *                       type: string
 *                       enum: [admin, leader, worker]
 *                       example: "worker"
 *                     passwordValidate:
 *                       type: string
 *                       example: "$2b$10$HNC7QHNSEmY7gvmLh/ZmB.EuPmg5br22QCT4LdV56j2A6zrIyhLMS"
 *                     user_task_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["664b1c123456abcdef7890"]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-15T18:31:21.793Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-15T18:35:00.000Z"
 *       400:
 *         description: taskType 不存在或已經加入過
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 該技能已經加入
 *       404:
 *         description: 找不到使用者
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 找不到使用者
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
router.post("/:id/add-task-type", async (req, res) => {
    try {
      const { id } = req.params;
      const { taskTypeId } = req.body;
  
      if (!taskTypeId) {
        return res.status(400).json({ error: "請提供 taskTypeId" });
      }
  
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: "找不到使用者" });
  
      const taskType = await TaskType.findById(taskTypeId);
      if (!taskType) return res.status(400).json({ error: "taskType 不存在" });
  
      const alreadyHas = user.user_task_types.includes(taskTypeId);
      if (alreadyHas) {
        return res.status(400).json({ error: "該技能已經加入" });
      }
  
      user.user_task_types.push(taskTypeId);
      await user.save();
  
      res.json({ message: "技能新增成功", user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

/**
 * @swagger
 * /users/{id}/remove-task-type:
 *   delete:
 *     summary: 移除指定使用者的技能（taskType）
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 使用者 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskTypeId
 *             properties:
 *               taskTypeId:
 *                 type: string
 *                 example: "664b1c123456abcdef7890"
 *     responses:
 *       200:
 *         description: 技能移除成功，回傳使用者資料
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 技能已成功移除
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "682632f9431fd350c9da1159"
 *                     userName:
 *                       type: string
 *                       example: "worker001"
 *                     userRole:
 *                       type: string
 *                       enum: [admin, leader, worker]
 *                       example: "worker"
 *                     passwordValidate:
 *                       type: string
 *                       example: "$2b$10$hashedPasswordHere"
 *                     user_task_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-15T18:31:21.793Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-05-15T18:40:00.000Z"
 *       400:
 *         description: taskType 不存在或不在使用者技能列表中
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 該技能不在使用者技能清單中
 *       404:
 *         description: 找不到使用者
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 找不到使用者
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
router.delete("/:id/remove-task-type", async (req, res) => {
    try {
      const { id } = req.params;
      const { taskTypeId } = req.body;
  
      if (!taskTypeId) {
        return res.status(400).json({ error: "請提供 taskTypeId" });
      }
  
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: "找不到使用者" });
  
      const index = user.user_task_types.indexOf(taskTypeId);
      if (index === -1) {
        return res.status(400).json({ error: "該技能不在使用者技能清單中" });
      }
  
      user.user_task_types.splice(index, 1);
      await user.save();
  
      res.json({ message: "技能已成功移除", user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});
  

module.exports = router;
