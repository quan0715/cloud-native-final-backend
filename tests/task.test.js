// const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('vitest');
import { describe, it, expect, beforeEach } from 'vitest';
const request = require('supertest');
import app from '../app';
const Task = require('../models/Task');
const TaskType = require('../models/TaskType');
const User = require('../models/User');
const Machine = require('../models/Machine');
import { initUser } from './globalSetup';


beforeEach(async () => {
  await Task.deleteMany({});
  await TaskType.deleteMany({});
  await User.deleteMany({});
  await Machine.deleteMany({});
});

describe('Task API Endpoints', () => {
  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      // Create a task type first
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const response = await request(app)
        .post('/tasks')
        .send({
          taskTypeId: taskType._id,
          taskName: '電性測試-001'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.taskName).toBe('電性測試-001');
      expect(response.body.taskData.state).toBe('draft');
    });

    it('should return 400 if taskTypeId does not exist', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          taskTypeId: '507f1f77bcf86cd799439011', // Non-existent ID
          taskName: '電性測試-001'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'taskTypeId 不存在');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/tasks')
        .send({
          taskName: '電性測試-001'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'taskTypeId 與 taskName 為必填');
    });
  });

  describe('GET /tasks', () => {
    it('should return all tasks with populated fields', async () => {
      // Create necessary data
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

    const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'leader' });
    const assignee = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const machine = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create a task
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        assigner_id: assigner._id,
        taskData: {
          state: 'in-progress',
          assignee_id: assignee._id,
          machine: [machine._id],
          assignTime: new Date(),
          startTime: new Date(),
          message: '測試中'
        }
      });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('taskName', '電性測試-001');
      expect(response.body[0].taskTypeId).toHaveProperty('taskName', '電性測試');
      expect(response.body[0].assigner_id).toHaveProperty('userName', 'admin1');
      expect(response.body[0].taskData.assignee_id).toHaveProperty('userName', 'worker1');
      expect(response.body[0].taskData.machine[0]).toHaveProperty('machineName', 'machine1');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should complete a task successfully', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'in-progress',
          message: '測試中'
        }
      });

      const response = await request(app)
        .patch(`/tasks/${task._id}/complete`)
        .send({
          message: '測試完成'
        });

      expect(response.status).toBe(200);
      expect(response.body.task.taskData.state).toBe('success');
      expect(response.body.task.taskData.message).toBe('測試完成');
      expect(response.body.task.taskData.endTime).toBeTruthy();
    });

    it('should return 400 if task is not in-progress', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .patch(`/tasks/${task._id}/complete`).send({
          message: '測試完成'
        });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', '任務當前狀態不是 in-progress，無法完成');
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a draft task', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .delete(`/tasks/${task._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '任務已刪除');

      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    it('should return 400 if task is not in draft state', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'in-progress'
        }
      });

      const response = await request(app)
        .delete(`/tasks/${task._id}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', '只能刪除 draft 狀態的任務');
    });
  });

  describe('PATCH /tasks/:id/fail', () => {
    it('should mark a task as failed', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'in-progress',
          message: '測試中'
        }
      });

      const response = await request(app)
        .patch(`/tasks/${task._id}/fail`)
        .send({
          message: '測試失敗'
        });

      expect(response.status).toBe(200);
      expect(response.body.task.taskData.state).toBe('fail');
      expect(response.body.task.taskData.message).toBe('測試失敗');
      expect(response.body.task.taskData.endTime).toBeTruthy();
    });

    it('should return 400 if task is not in-progress', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .patch(`/tasks/${task._id}/fail`).send({
          message: '測試失敗'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', '任務當前狀態不是 in-progress，無法標記為失敗');
    });
  });

  describe('POST /tasks/auto-assign-preview', () => {
    it('should return preview of task assignments', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });
    const worker = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });
    worker.user_task_types = [taskType._id];
    await worker.save();
      // Create draft tasks
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .post('/tasks/auto-assign-preview');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('taskName', '電性測試-001');
      expect(response.body[0].previewAssignee).toHaveProperty('userName', 'worker1');
    });
  });

  describe('PATCH /tasks/auto-assign-confirm', () => {
    it('should assign tasks based on preview', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

    const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });

    const assignee = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      // Create draft task
      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .patch('/tasks/auto-assign-confirm')
        .send({
          assignerId: assigner._id,
          assignments: [{
            taskId: task._id,
            assigneeId: assignee._id
          }]
        });

      expect(response.status).toBe(200);
      expect(response.body.results[0]).toHaveProperty('status', 'assigned');

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.taskData.state).toBe('assigned');
      expect(updatedTask.assigner_id.toString()).toBe(assigner._id.toString());
      expect(updatedTask.taskData.assignee_id.toString()).toBe(assignee._id.toString());
    });

    it('should handle invalid assignments', async () => {
      const response = await request(app)
        .patch('/tasks/auto-assign-confirm')
        .send({
          assignerId: '507f1f77bcf86cd799439011',
          assignments: [{
            taskId: '507f1f77bcf86cd799439012',
            assigneeId: '507f1f77bcf86cd799439013'
          }]
        });

      expect(response.status).toBe(200);
      expect(response.body.results[0]).toHaveProperty('status', 'skipped');
    });
  });

  describe('PATCH /tasks/start-next', () => {
    it('should start next available task', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

    const worker = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      // Create available machines
      const machine1 = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      const machine2 = await Machine.create({
        machineName: 'machine2',
        machine_task_types: [taskType._id]
      });

      // Create assigned task
      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      const response = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(response.status).toBe(200);
      expect(response.body.task.taskData.state).toBe('in-progress');
      expect(response.body.task.taskData.machine).toHaveLength(2);
      expect(response.body.task.taskData.startTime).toBeTruthy();
    });

    it('should return 400 if no tasks available', async () => {

      const worker = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const response = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', '目前沒有可啟動的任務');
    });
  });
});
