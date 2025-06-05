import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
// Import mongoose but not the models directly
import mongoose from 'mongoose';
// Import a function to get models instead of the models directly
import { getModels } from './testUtils';
import { initUser } from './globalSetup';

// Get model references without recompiling
const { Task, TaskType, User, Machine } = getModels();


describe('Integration Tests - Complete Workflows', () => {

  beforeEach(async () => {
    await Task.deleteMany({});
    await TaskType.deleteMany({});
    await User.deleteMany({});
    await Machine.deleteMany({});
  });
  
  describe('Complete Task Workflow: draft → assigned → in-progress → success', () => {
    it('should complete full task lifecycle', async () => {
      // 1. 設置基礎資料
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const leader = await initUser({ 
        userName: 'leader001', 
        password: '123456', 
        userRole: 'leader' 
      });

      const worker = await initUser({ 
        userName: 'worker001', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType._id];
      await worker.save();

      const machine1 = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      const machine2 = await Machine.create({
        machineName: 'machine2',
        machine_task_types: [taskType._id]
      });

      // 2. Step 1: 建立 draft 任務
      const createResponse = await request(app)
        .post('/tasks')
        .send({
          taskTypeId: taskType._id,
          taskName: '電性測試-001'
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.taskData.state).toBe('draft');
      const taskId = createResponse.body._id;

      // 3. Step 2: 預覽自動分配
      const previewResponse = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(previewResponse.status).toBe(200);
      expect(previewResponse.body.length).toBe(1);
      expect(previewResponse.body[0].previewAssignee.userName).toBe('worker001');

      // 4. Step 3: 確認分配 (draft → assigned)
      const assignResponse = await request(app)
        .patch('/tasks/auto-assign-confirm')
        .send({
          assignerId: leader._id,
          assignments: [{
            taskId: taskId,
            assigneeId: worker._id
          }]
        });

      expect(assignResponse.status).toBe(200);
      expect(assignResponse.body.results[0].status).toBe('assigned');

      // 5. Step 4: 啟動任務 (assigned → in-progress)
      const startResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(startResponse.status).toBe(200);
      expect(startResponse.body.task.taskData.state).toBe('in-progress');
      expect(startResponse.body.task.taskData.machine).toHaveLength(2);
      expect(startResponse.body.task.taskData.startTime).toBeTruthy();

      // 6. Step 5: 完成任務 (in-progress → success)
      const completeResponse = await request(app)
        .patch(`/tasks/${taskId}/complete`)
        .send({
          message: '測試完成，數據正常'
        });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.task.taskData.state).toBe('success');
      expect(completeResponse.body.task.taskData.endTime).toBeTruthy();
      expect(completeResponse.body.task.taskData.message).toBe('測試完成，數據正常');

      // 7. 驗證完整流程
      const finalTask = await Task.findById(taskId).populate('taskData.assignee_id');
      expect(finalTask.taskData.state).toBe('success');
      expect(finalTask.taskData.assignee_id.userName).toBe('worker001');
      expect(finalTask.taskData.assignTime).toBeTruthy();
      expect(finalTask.taskData.startTime).toBeTruthy();
      expect(finalTask.taskData.endTime).toBeTruthy();
    });

    it('should handle task failure workflow', async () => {
      // 設置基礎資料 (簡化版)
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      const worker = await initUser({ 
        userName: 'worker001', 
        password: '123456', 
        userRole: 'worker' 
      });

      const machine = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // 建立進行中的任務
      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-fail',
        taskData: {
          state: 'in-progress',
          assignee_id: worker._id,
          machine: [machine._id],
          startTime: new Date()
        }
      });

      // 標記任務失敗
      const failResponse = await request(app)
        .patch(`/tasks/${task._id}/fail`)
        .send({
          message: '設備故障，測試中斷'
        });

      expect(failResponse.status).toBe(200);
      expect(failResponse.body.task.taskData.state).toBe('fail');
      expect(failResponse.body.task.taskData.endTime).toBeTruthy();
      expect(failResponse.body.task.taskData.message).toBe('設備故障，測試中斷');
    });
  });

  describe('task assignment and machine status checks', () => {
    let taskType;
    beforeEach(async () => {
      await Task.deleteMany({});
      await TaskType.deleteMany({});
      await User.deleteMany({});
      await Machine.deleteMany({});
      
      taskType = await TaskType.create({
        taskName: '測試任務類型',
        number_of_machine: 2
      });
    });

    it('should return machine with in-use status when machine has running task', async () => {
      // 建立測試機器
      const machine = await Machine.create({ 
        machineName: 'GPU-01', 
        machine_task_types: [taskType._id] 
      });

      // 建立進行中的任務
      await Task.create({
        taskName: '進行中任務',
        taskTypeId: taskType._id,
        taskType: taskType._id,
        taskData: {
          state: 'in-progress',
          machine: [machine._id]
        }
      });

      // 測試 GET /:id 端點
      const res = await request(app).get(`/machines/${machine._id}`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in-use');
    });

    it('should return machine with idle status when machine has no running task', async () => {
      // 建立測試機器
      const machine = await Machine.create({ 
        machineName: 'GPU-01', 
        machine_task_types: [taskType._id] 
      });

      // 建立已完成的任務
      await Task.create({
        taskName: '電性測試-完成',
        taskTypeId: taskType._id,
        taskType: taskType._id,
        taskData: {
          state: 'success',
          machine: [machine._id]
        }
      });

      // 測試 GET /:id 端點
      const res = await request(app).get(`/machines/${machine._id}`);
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('idle');
    });

  });

  describe('Weekly Load Statistics Tests', () => {
    it('should track weekly task assignments correctly', async () => {
      // 設置測試資料
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      const worker = await initUser({ 
        userName: 'worker001', 
        password: '123456', 
        userRole: 'worker' 
      });

      // 建立本週的任務
      const now = new Date();
      const thisWeekTask = await Task.create({
        taskTypeId: taskType._id,
        taskName: '本週任務',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id,
          assignTime: now
        }
      });

      // 建立上週的任務 (不應該被計入)
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '上週任務',
        taskData: {
          state: 'success',
          assignee_id: worker._id,
          assignTime: lastWeek,
          endTime: lastWeek
        }
      });

      // 測試週報功能
      const response = await request(app)
        .get(`/tasks/week-load/${worker._id}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].taskName).toBe('本週任務');
      // 修正：API返回的是taskData.state而不是單獨的state屬性
      expect(response.body.tasks[0].taskData.state).toBe('assigned');
    });

    it('should handle non-existent user in weekly load', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/tasks/week-load/${fakeUserId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('找不到使用者');
    });
  });

  describe('Load Query Tests', () => {
    it('should return all workers load correctly', async () => {
      // 設置測試資料
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      const worker1 = await initUser({ 
        userName: 'worker001', 
        password: '123456', 
        userRole: 'worker' 
      });

      const worker2 = await initUser({ 
        userName: 'worker002', 
        password: '123456', 
        userRole: 'worker' 
      });

      // 為 worker1 建立任務
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '任務1',
        taskData: {
          state: 'assigned',
          assignee_id: worker1._id
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '任務2',
        taskData: {
          state: 'in-progress',
          assignee_id: worker1._id
        }
      });

      // 測試負載查詢
      const response = await request(app)
        .get('/tasks/load');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      const worker1Load = response.body.find(w => w.userName === 'worker001');
      const worker2Load = response.body.find(w => w.userName === 'worker002');

      expect(worker1Load.assigned).toHaveLength(1);
      expect(worker1Load.inProgress).toHaveLength(1);
      expect(worker2Load.assigned).toHaveLength(0);
      expect(worker2Load.inProgress).toHaveLength(0);
    });

    it('should return specific user load', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      const worker = await initUser({ 
        userName: 'worker001', 
        password: '123456', 
        userRole: 'worker' 
      });

      // 建立各種狀態的任務
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '指派任務',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '進行中任務',
        taskData: {
          state: 'in-progress',
          assignee_id: worker._id
        }
      });

      // 已完成任務不應出現在負載中
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '已完成任務',
        taskData: {
          state: 'success',
          assignee_id: worker._id
        }
      });

      const response = await request(app)
        .get(`/tasks/load/${worker._id}`);

      expect(response.status).toBe(200);
      expect(response.body.assigned).toHaveLength(1);
      expect(response.body.inProgress).toHaveLength(1);
      expect(response.body.assigned[0].taskName).toBe('指派任務');
      expect(response.body.inProgress[0].taskName).toBe('進行中任務');
    });
  });

  describe('Users with Tasks Integration', () => {
    it('should return users with their task summaries', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      const worker = await initUser({ 
        userName: 'worker001', 
        password: '123456', 
        userRole: 'worker' 
      });

      const machine = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // 建立不同狀態的任務
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '指派任務',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id,
          machine: []
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '進行中任務',
        taskData: {
          state: 'in-progress',
          assignee_id: worker._id,
          machine: [machine._id]
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '完成任務',
        taskData: {
          state: 'success',
          assignee_id: worker._id,
          machine: []
        }
      });

      const response = await request(app)
        .get('/users/with-tasks');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      const workerData = response.body.find(u => u.userName === 'worker001');
      expect(workerData).toBeDefined();
      expect(workerData.assignedTasks).toHaveLength(1);
      expect(workerData.inProgressTasks).toHaveLength(1);
      expect(workerData.completedTasks).toHaveLength(1);
      expect(workerData.assignedTasks[0].taskName).toBe('指派任務');
      expect(workerData.inProgressTasks[0].taskName).toBe('進行中任務');
      expect(workerData.completedTasks[0].taskName).toBe('完成任務');
    });
  });
});

// describe('Resource Conflict Tests', () => {
//   let taskType;

//   beforeEach(async () => {
//     await Task.deleteMany({});
//     await TaskType.deleteMany({});
//     await User.deleteMany({});
//     await Machine.deleteMany({});
//     taskType = await TaskType.create({
//       taskName: '測試任務類型',
//       number_of_machine: 2,
//     });
//   });

//   describe('Task Assignment Conflicts', () => {
//     it('should prevent worker from starting multiple tasks simultaneously', async () => {
//       const worker = await initUser({ 
//         userName: 'worker001', 
//         password: '123456', 
//         userRole: 'worker' 
//       });

//       const machine1 = await Machine.create({
//         machineName: 'machine1',
//         machine_task_types: [taskType._id]
//       });

//       const machine2 = await Machine.create({
//         machineName: 'machine2',
//         machine_task_types: [taskType._id]
//       });

//       // 建立兩個 assigned 任務
//       await Task.create({
//         taskTypeId: taskType._id,
//         taskName: '任務1',
//         taskData: {
//           state: 'assigned',
//           assignee_id: worker._id
//         }
//       });

//       await Task.create({
//         taskTypeId: taskType._id,
//         taskName: '任務2',
//         taskData: {
//           state: 'assigned',
//           assignee_id: worker._id
//         }
//       });

//       // 啟動第一個任務
//       const firstStart = await request(app)
//         .patch('/tasks/start-next')
//         .send({ workerId: worker._id });

//       expect(firstStart.status).toBe(200);

//       // 嘗試啟動第二個任務 (應該失敗)
//       const secondStart = await request(app)
//         .patch('/tasks/start-next')
//         .send({ workerId: worker._id });

//       expect(secondStart.status).toBe(400);
//       expect(secondStart.body.error).toBe('該使用者已有進行中的任務，無法啟動新任務');
//     });

//   });
// });