// const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('vitest');
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

    it('should handle database errors when fetching tasks', async () => {
      // Mock Task.find and its chain methods
      const mockPopulate = vi.fn().mockReturnThis();
      const mockFind = vi.fn().mockReturnValue({
        populate: mockPopulate
      });
      const originalFind = Task.find;
      Task.find = mockFind;

      // Mock the populate chain to throw an error
      mockPopulate.mockImplementation(() => {
        throw new Error('Failed to fetch tasks');
      });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch tasks');

      // Restore original function
      Task.find = originalFind;
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

    it('should return 404 when task not found', async () => {
      const response = await request(app)
        .patch('/tasks/507f1f77bcf86cd799439011/complete')
        .send({
          message: '測試完成'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', '找不到任務');
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

    it('should return 404 when task not found', async () => {
      const response = await request(app)
        .patch('/tasks/507f1f77bcf86cd799439011/fail')
        .send({
          message: '測試失敗'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', '找不到任務');
    });

    it('should handle database errors when marking task as failed', async () => {
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

      // Mock Task.findById to throw an error
      const originalFindById = Task.findById;
      Task.findById = vi.fn().mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .patch(`/tasks/${task._id}/fail`)
        .send({
          message: '測試失敗'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Database connection error');

      // Restore original function
      Task.findById = originalFindById;
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

    it('should handle database errors during preview', async () => {
      // Mock Task.find to throw an error
      const originalFind = Task.find;
      Task.find = vi.fn().mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '預覽任務指派失敗');

      // Restore original function
      Task.find = originalFind;
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

  describe('GET /tasks/:id', () => {
    it('should return a task with populated fields', async () => {
      // Create necessary data
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });
      const assignee = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const machine = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create a task
      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        assigner_id: assigner._id,
        taskData: {
          state: 'in-progress',
          assignee_id: assignee._id,
          machine: [machine._id],
          assignTime: new Date(),
          startTime: new Date(),
          message: '處理中'
        }
      });

      const response = await request(app)
        .get(`/tasks/${task._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', task._id.toString());
      expect(response.body).toHaveProperty('taskName', '電性測試-001');
      expect(response.body.taskTypeId).toHaveProperty('taskName', '電性測試');
      expect(response.body.assigner_id).toHaveProperty('userName', 'admin1');
      expect(response.body.taskData.assignee_id).toHaveProperty('userName', 'worker1');
      expect(response.body.taskData.machine[0]).toHaveProperty('machineName', 'machine1');
      expect(response.body.taskData.state).toBe('in-progress');
    });

    it('should return 404 when task not found', async () => {
      const response = await request(app)
        .get('/tasks/507f1f77bcf86cd799439011'); // Non-existent ID

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', '找不到任務');
    });

    it('should handle database errors when finding task', async () => {
      // Mock Task.findById and its chain methods
      const mockPopulate = vi.fn().mockReturnThis();
      const mockLean = vi.fn().mockReturnThis();
      const mockFindById = vi.fn().mockReturnValue({
        populate: mockPopulate,
        lean: mockLean
      });
      const originalFindById = Task.findById;
      Task.findById = mockFindById;

      // Mock the populate chain to throw an error
      mockPopulate.mockImplementation(() => {
        throw new Error('Failed to fetch task');
      });

      const response = await request(app)
        .get('/tasks/507f1f77bcf86cd799439011');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch task');

      // Restore original function
      Task.findById = originalFindById;
    });

    it('should handle invalid task ID format', async () => {
      const response = await request(app)
        .get('/tasks/invalid-id-format');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Cast to ObjectId failed for value "invalid-id-format" (type string) at path "_id" for model "Task"');
    });
  });
});

describe('Task API Error Handling', () => {
  describe('POST /tasks', () => {
    it('should handle database errors when creating a task', async () => {
      // Mock TaskType.findById to throw an error
      const originalFindById = TaskType.findById;
      TaskType.findById = vi.fn().mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .post('/tasks')
        .send({
          taskTypeId: '507f1f77bcf86cd799439011',
          taskName: '電性測試-001'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Database connection error');

      // Restore original function
      TaskType.findById = originalFindById;
    });
  });

  describe('GET /tasks', () => {
    it('should handle database errors when fetching tasks', async () => {
      // Mock Task.find and its chain methods
      const mockPopulate = vi.fn().mockReturnThis();
      const mockFind = vi.fn().mockReturnValue({
        populate: mockPopulate
      });
      const originalFind = Task.find;
      Task.find = mockFind;

      // Mock the populate chain to throw an error
      mockPopulate.mockImplementation(() => {
        throw new Error('Failed to fetch tasks');
      });

      const response = await request(app).get('/tasks');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch tasks');

      // Restore original function
      Task.find = originalFind;
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should handle database errors when completing a task', async () => {
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

      // Mock Task.findById to throw an error
      const originalFindById = Task.findById;
      Task.findById = vi.fn().mockRejectedValue(new Error('Failed to find task'));

      const response = await request(app)
        .patch(`/tasks/${task._id}/complete`)
        .send({
          message: '測試完成'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to find task');

      // Restore original function
      Task.findById = originalFindById;
    });
  });

  describe('PATCH /tasks/auto-assign-confirm', () => {
    it('should handle database errors during task assignment', async () => {
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });
      const assignee = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const task = await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      // Mock Task.findById to throw an error
      const originalFindById = Task.findById;
      Task.findById = vi.fn().mockRejectedValue(new Error('Failed to find task during assignment'));

      const response = await request(app)
        .patch('/tasks/auto-assign-confirm')
        .send({
          assignerId: assigner._id,
          assignments: [{
            taskId: task._id,
            assigneeId: assignee._id
          }]
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '指派過程發生錯誤');

      // Restore original function
      Task.findById = originalFindById;
    });
  });

  describe('PATCH /tasks/start-next', () => {
    it('should handle database errors when starting next task', async () => {
      const worker = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      // Mock Task.findOne to throw an error
      const originalFindOne = Task.findOne;
      Task.findOne = vi.fn().mockRejectedValue(new Error('Failed to check current tasks'));

      const response = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '啟動任務時發生錯誤');

      // Restore original function
      Task.findOne = originalFindOne;
    });
  });

  describe('GET /tasks/load', () => {
    it('should return load information for all workers', async () => {
      // Create necessary data
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });
      const worker1 = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });
      const worker2 = await initUser({ userName: 'worker2', password: '123456', userRole: 'worker' });

      const machine = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create tasks for worker1
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        assigner_id: assigner._id,
        taskData: {
          state: 'assigned',
          assignee_id: worker1._id,
          machine: [machine._id],
          assignTime: new Date(),
          message: '待處理'
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        assigner_id: assigner._id,
        taskData: {
          state: 'in-progress',
          assignee_id: worker1._id,
          machine: [machine._id],
          assignTime: new Date(),
          startTime: new Date(),
          message: '處理中'
        }
      });

      // Create task for worker2
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-003',
        assigner_id: assigner._id,
        taskData: {
          state: 'assigned',
          assignee_id: worker2._id,
          machine: [machine._id],
          assignTime: new Date(),
          message: '待處理'
        }
      });

      const response = await request(app).get('/tasks/load');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Verify worker1's data
      const worker1Data = response.body.find(w => w.userId === worker1._id.toString());
      expect(worker1Data).toBeTruthy();
      expect(worker1Data.userName).toBe('worker1');
      expect(worker1Data.assigned).toHaveLength(1);
      expect(worker1Data.inProgress).toHaveLength(1);
      expect(worker1Data.assigned[0].taskName).toBe('電性測試-001');
      expect(worker1Data.inProgress[0].taskName).toBe('電性測試-002');

      // Verify worker2's data
      const worker2Data = response.body.find(w => w.userId === worker2._id.toString());
      expect(worker2Data).toBeTruthy();
      expect(worker2Data.userName).toBe('worker2');
      expect(worker2Data.assigned).toHaveLength(1);
      expect(worker2Data.inProgress).toHaveLength(0);
      expect(worker2Data.assigned[0].taskName).toBe('電性測試-003');
    });

    it('should return empty arrays for workers with no tasks', async () => {
      // Create a worker with no tasks
      await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const response = await request(app).get('/tasks/load');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].assigned).toHaveLength(0);
      expect(response.body[0].inProgress).toHaveLength(0);
    });

    it('should handle database errors when finding workers', async () => {
      // Mock User.find to throw an error
      const originalFind = User.find;
      User.find = vi.fn().mockRejectedValue(new Error('查詢使用者負載時發生錯誤'));

      const response = await request(app).get('/tasks/load');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '查詢使用者負載時發生錯誤');

      // Restore original function
      User.find = originalFind;
    });

    it('should handle database errors when finding tasks', async () => {
      // Create a worker first
      await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      // Mock Task.find and its chain methods
      const mockPopulate = vi.fn().mockReturnThis();
      const mockLean = vi.fn().mockReturnThis();
      const mockFind = vi.fn().mockReturnValue({
        populate: mockPopulate,
        lean: mockLean
      });
      const originalFind = Task.find;
      Task.find = mockFind;

      // Mock the populate chain to throw an error
      mockPopulate.mockImplementation(() => {
        throw new Error('Failed to fetch tasks');
      });

      const response = await request(app).get('/tasks/load');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '查詢使用者負載時發生錯誤');

      // Restore original function
      Task.find = originalFind;
    });

    it('should only include workers in the response', async () => {
      // Create users with different roles
      await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });
      await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });
      await initUser({ userName: 'leader1', password: '123456', userRole: 'leader' });

      const response = await request(app).get('/tasks/load');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1); // Only worker should be included
      expect(response.body[0].userName).toBe('worker1');
    });
  });

  describe('GET /tasks/week-load/:userId', () => {
    it('should handle database errors when fetching weekly load', async () => {
      const worker = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      // Mock Task.find to throw an error
      const originalFind = Task.find;
      Task.find = vi.fn().mockRejectedValue(new Error('查詢過程發生錯誤'));

      const response = await request(app)
        .get(`/tasks/week-load/${worker._id}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '查詢過程發生錯誤');

      // Restore original function
      Task.find = originalFind;
    });
  });

  describe('PATCH /tasks/:id/update-draft', () => {
    it('should handle database errors when updating draft task', async () => {
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

      // Mock Task.findById to throw an error
      const originalFindById = Task.findById;
      Task.findById = vi.fn().mockRejectedValue(new Error('Failed to find task for update'));

      const response = await request(app)
        .patch(`/tasks/${task._id}/update-draft`)
        .send({
          taskName: '電性測試-002'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '更新任務時發生錯誤');

      // Restore original function
      Task.findById = originalFindById;
    });
  });

  describe('GET /tasks/load/:userId', () => {
    it('should return user tasks in assigned and in-progress states', async () => {
      // Create necessary data
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });
      const assignee = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const machine = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create assigned task
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        assigner_id: assigner._id,
        taskData: {
          state: 'assigned',
          assignee_id: assignee._id,
          machine: [machine._id],
          assignTime: new Date(),
          message: '待處理'
        }
      });

      // Create in-progress task
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        assigner_id: assigner._id,
        taskData: {
          state: 'in-progress',
          assignee_id: assignee._id,
          machine: [machine._id],
          assignTime: new Date(),
          startTime: new Date(),
          message: '處理中'
        }
      });

      const response = await request(app)
        .get(`/tasks/load/${assignee._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('assigned');
      expect(response.body).toHaveProperty('inProgress');
      expect(response.body.assigned).toHaveLength(1);
      expect(response.body.inProgress).toHaveLength(1);
      expect(response.body.assigned[0].taskName).toBe('電性測試-001');
      expect(response.body.inProgress[0].taskName).toBe('電性測試-002');
    });

    it('should return 404 when user not found', async () => {
      const response = await request(app)
        .get('/tasks/load/507f1f77bcf86cd799439011'); // Non-existent ID

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', '找不到使用者');
    });

    it('should handle database errors when finding user', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = vi.fn().mockRejectedValue(new Error('Database connection error'));

      const response = await request(app)
        .get('/tasks/load/507f1f77bcf86cd799439011');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '查詢過程發生錯誤');

      // Restore original function
      User.findById = originalFindById;
    });

    it('should handle database errors when finding tasks', async () => {
      const worker = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      // Mock Task.find and its chain methods
      const mockPopulate = vi.fn().mockReturnThis();
      const mockFind = vi.fn().mockReturnValue({
        populate: mockPopulate
      });
      const originalFind = Task.find;
      Task.find = mockFind;

      // Mock the populate chain to throw an error
      mockPopulate.mockImplementation(() => {
        throw new Error('Failed to fetch tasks');
      });

      const response = await request(app)
        .get(`/tasks/load/${worker._id}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '查詢過程發生錯誤');

      // Restore original function
      Task.find = originalFind;
    });

    it('should return empty arrays when user has no tasks', async () => {
      const worker = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const response = await request(app)
        .get(`/tasks/load/${worker._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('assigned');
      expect(response.body).toHaveProperty('inProgress');
      expect(response.body.assigned).toHaveLength(0);
      expect(response.body.inProgress).toHaveLength(0);
    });
  });

  describe('GET /tasks/draft', () => {
    it('should return all draft tasks with populated fields', async () => {
      // Create necessary data
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });
      const assignee = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      const machine = await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create draft tasks
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        assigner_id: assigner._id,
        taskData: {
          state: 'draft',
          assignee_id: assignee._id,
          machine: [machine._id],
          message: '待處理'
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        assigner_id: assigner._id,
        taskData: {
          state: 'draft',
          assignee_id: assignee._id,
          machine: [machine._id],
          message: '待處理'
        }
      });

      const response = await request(app).get('/tasks/draft');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      
      // Verify first task
      expect(response.body[0]).toHaveProperty('taskName', '電性測試-001');
      expect(response.body[0].taskTypeId).toHaveProperty('taskName', '電性測試');
      expect(response.body[0].assigner_id).toHaveProperty('userName', 'admin1');
      expect(response.body[0].taskData.assignee_id).toHaveProperty('userName', 'worker1');
      expect(response.body[0].taskData.machine[0]).toHaveProperty('machineName', 'machine1');
      
      // Verify second task
      expect(response.body[1]).toHaveProperty('taskName', '電性測試-002');
      expect(response.body[1].taskTypeId).toHaveProperty('taskName', '電性測試');
      expect(response.body[1].assigner_id).toHaveProperty('userName', 'admin1');
      expect(response.body[1].taskData.assignee_id).toHaveProperty('userName', 'worker1');
      expect(response.body[1].taskData.machine[0]).toHaveProperty('machineName', 'machine1');
    });

    it('should return empty array when no draft tasks exist', async () => {
      const response = await request(app).get('/tasks/draft');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should handle database errors when fetching draft tasks', async () => {
      // Mock Task.find and its chain methods
      const mockPopulate = vi.fn().mockReturnThis();
      const mockFind = vi.fn().mockReturnValue({
        populate: mockPopulate
      });
      const originalFind = Task.find;
      Task.find = mockFind;

      // Mock the populate chain to throw an error
      mockPopulate.mockImplementation(() => {
        throw new Error('Failed to fetch draft tasks');
      });

      const response = await request(app).get('/tasks/draft');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', '查詢 draft 任務時發生錯誤');

      // Restore original function
      Task.find = originalFind;
    });

    it('should only return tasks with draft state', async () => {
      // Create necessary data
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      const assigner = await initUser({ userName: 'admin1', password: '123456', userRole: 'admin' });
      const assignee = await initUser({ userName: 'worker1', password: '123456', userRole: 'worker' });

      // Create tasks in different states
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        assigner_id: assigner._id,
        taskData: {
          state: 'draft',
          assignee_id: assignee._id,
          message: '待處理'
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        assigner_id: assigner._id,
        taskData: {
          state: 'in-progress',
          assignee_id: assignee._id,
          message: '處理中'
        }
      });

      const response = await request(app).get('/tasks/draft');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].taskName).toBe('電性測試-001');
      expect(response.body[0].taskData.state).toBe('draft');
    });
  });
});
