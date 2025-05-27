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

describe('Task Scheduling and Assignment', () => {
  describe('Suite 1: Task Assignment to Workers', () => {
    it('T1.1: Basic Match - Should assign task to eligible worker', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      // Create worker with matching task type
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType._id];
      await worker.save();

      // Create draft task
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
      expect(response.body[0].previewAssignee.userName).toBe('worker1');
    });

    it('T1.2: Worker Type Mismatch - Should not assign task to incompatible worker', async () => {
      // Create two different task types
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });
      const temperatureTest = await TaskType.create({
        taskName: '溫度測試',
        number_of_machine: 1
      });

      // Create worker with temperature test capability only
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [temperatureTest._id];
      await worker.save();

      // Create electrical test task
      await Task.create({
        taskTypeId: electricalTest._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // if no worker can do the task, the array should be empty
      expect(response.body.length).toBe(0);
    //   expect(response.body.length).toBe(1);
    //   expect(response.body[0].previewAssignee).toBeNull();
    });

    it('T1.3: Multiple Tasks, One Worker - Should assign all tasks to the same worker', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType._id];
      await worker.save();

      // Create two draft tasks
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].previewAssignee.userName).toBe('worker1');
      expect(response.body[1].previewAssignee.userName).toBe('worker1');
    });

    it('T1.4: No Matching Workers - Should not assign task', async () => {
      // Create two different task types
      const physicalTest = await TaskType.create({
        taskName: '物性測試',
        number_of_machine: 1
      });
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      // Create workers with electrical test capability only
      const worker1 = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker1.user_task_types = [electricalTest._id];
      await worker1.save();

      const worker2 = await initUser({ 
        userName: 'worker2', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker2.user_task_types = [electricalTest._id];
      await worker2.save();

      // Create physical test task
      await Task.create({
        taskTypeId: physicalTest._id,
        taskName: '物性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // if no worker can do the task, the array should be empty
      expect(response.body.length).toBe(0);
    //   expect(response.body.length).toBe(1);
    //   expect(response.body[0].previewAssignee).toBeNull();
    });

    it('T1.5: Worker with Multiple Capabilities - Should assign task correctly', async () => {
      // Create task types
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });
      const temperatureTest = await TaskType.create({
        taskName: '溫度測試',
        number_of_machine: 1
      });

      // Create worker with both capabilities
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [electricalTest._id, temperatureTest._id];
      await worker.save();

      // Create electrical test task
      await Task.create({
        taskTypeId: electricalTest._id,
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
      expect(response.body[0].previewAssignee.userName).toBe('worker1');
    });

    it('T1.6: Batch Assignment - Should assign tasks to correct workers', async () => {
      // Create task types
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });
      const temperatureTest = await TaskType.create({
        taskName: '溫度測試',
        number_of_machine: 1
      });
      const physicalTest = await TaskType.create({
        taskName: '物性測試',
        number_of_machine: 1
      });

      // Create workers with different capabilities
      const worker1 = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker1.user_task_types = [electricalTest._id];
      await worker1.save();

      const worker2 = await initUser({ 
        userName: 'worker2', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker2.user_task_types = [temperatureTest._id];
      await worker2.save();

      const worker3 = await initUser({ 
        userName: 'worker3', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker3.user_task_types = [physicalTest._id];
      await worker3.save();

      // Create tasks of different types
      await Task.create({
        taskTypeId: electricalTest._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      await Task.create({
        taskTypeId: temperatureTest._id,
        taskName: '溫度測試-001',
        taskData: {
          state: 'draft'
        }
      });

      await Task.create({
        taskTypeId: physicalTest._id,
        taskName: '物性測試-001',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0].previewAssignee.userName).toBe('worker1');
      expect(response.body[1].previewAssignee.userName).toBe('worker2');
      expect(response.body[2].previewAssignee.userName).toBe('worker3');
    });

    it('T1.7: Worker Load Balancing - Should assign to worker with lower load', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      // Create two workers with different loads
      const worker1 = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker1.user_task_types = [taskType._id];
      await worker1.save();

      const worker2 = await initUser({ 
        userName: 'worker2', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker2.user_task_types = [taskType._id];
      await worker2.save();

      // Create in-progress task for worker1
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'in-progress',
          assignee_id: worker1._id
        }
      });

      // Create new draft task
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].previewAssignee.userName).toBe('worker2');
    });

    it('T1.8: Specialist vs Generalist - Should prefer specialist when loads are equal', async () => {
      // Create task types
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });
      const temperatureTest = await TaskType.create({
        taskName: '溫度測試',
        number_of_machine: 1
      });

      // Create specialist (only electrical test)
      const specialist = await initUser({ 
        userName: 'specialist', 
        password: '123456', 
        userRole: 'worker' 
      });
      specialist.user_task_types = [electricalTest._id];
      await specialist.save();

      // Create generalist (both electrical and temperature test)
      const generalist = await initUser({ 
        userName: 'generalist', 
        password: '123456', 
        userRole: 'worker' 
      });
      generalist.user_task_types = [electricalTest._id, temperatureTest._id];
      await generalist.save();

      // Create electrical test task
      await Task.create({
        taskTypeId: electricalTest._id,
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
      expect(response.body[0].previewAssignee.userName).toBe('specialist');
    });

    it('T1.9: Load vs Specialization - Should balance between load and specialization', async () => {
      // Create task types
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });
      const temperatureTest = await TaskType.create({
        taskName: '溫度測試',
        number_of_machine: 1
      });

      // Create specialist with high load
      const specialist = await initUser({ 
        userName: 'specialist', 
        password: '123456', 
        userRole: 'worker' 
      });
      specialist.user_task_types = [electricalTest._id];
      await specialist.save();

      // Create generalist with no load
      const generalist = await initUser({ 
        userName: 'generalist', 
        password: '123456', 
        userRole: 'worker' 
      });
      generalist.user_task_types = [electricalTest._id, temperatureTest._id];
      await generalist.save();

      // Create 3 in-progress tasks for specialist
      for (let i = 1; i <= 3; i++) {
        await Task.create({
          taskTypeId: electricalTest._id,
          taskName: `電性測試-00${i}`,
          taskData: {
            state: 'in-progress',
            assignee_id: specialist._id
          }
        });
      }

      // Create new electrical test task
      await Task.create({
        taskTypeId: electricalTest._id,
        taskName: '電性測試-004',
        taskData: {
          state: 'draft'
        }
      });

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].previewAssignee.userName).toBe('generalist');
    });

    it('T1.10: Multiple Tasks with Load Balancing - Should distribute tasks based on load', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      // Create three workers
      const worker1 = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker1.user_task_types = [taskType._id];
      await worker1.save();

      const worker2 = await initUser({ 
        userName: 'worker2', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker2.user_task_types = [taskType._id];
      await worker2.save();

      const worker3 = await initUser({ 
        userName: 'worker3', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker3.user_task_types = [taskType._id];
      await worker3.save();

      // Create initial load distribution
      // worker1: 2 tasks
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'in-progress',
          assignee_id: worker1._id
        }
      });
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        taskData: {
          state: 'in-progress',
          assignee_id: worker1._id
        }
      });

      // worker2: 1 task
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-003',
        taskData: {
          state: 'in-progress',
          assignee_id: worker2._id
        }
      });

      // worker3: 0 tasks

      // Create 3 new draft tasks
      for (let i = 4; i <= 6; i++) {
        await Task.create({
          taskTypeId: taskType._id,
          taskName: `電性測試-00${i}`,
          taskData: {
            state: 'draft'
          }
        });
      }

      const response = await request(app)
        .post('/tasks/auto-assign-preview');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);

      // Verify task distribution
      const assignments = response.body.map(task => task.previewAssignee.userName);
      const worker3Count = assignments.filter(name => name === 'worker3').length;
      const worker2Count = assignments.filter(name => name === 'worker2').length;
      const worker1Count = assignments.filter(name => name === 'worker1').length;

      // worker3 should get most tasks (2) as they have no load
      expect(worker3Count).toBe(2);
      // worker2 should get 1 task as they have medium load
      expect(worker2Count).toBe(1);
      // worker1 should get no new tasks as they have highest load
      expect(worker1Count).toBe(0);
    });
  });

  describe('Suite 2: Machine Assignment to Workers', () => {
    it('M2.1: Basic Machine Match - Should assign matching machine', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType._id];
      await worker.save();

      // Create matching machine
      const machine = await Machine.create({
        machineName: 'machine1',
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
      expect(response.body.task.taskData.machine).toHaveLength(1);
      expect(response.body.task.taskData.machine[0]).toBe(machine._id.toString());
    });

    it('M2.2: Machine Type Mismatch - Should not assign incompatible machine', async () => {
      // Create task types
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });
      const temperatureTest = await TaskType.create({
        taskName: '溫度測試',
        number_of_machine: 1
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [electricalTest._id];
      await worker.save();

      // Create incompatible machine
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [temperatureTest._id]
      });

      // Create assigned task
      await Task.create({
        taskTypeId: electricalTest._id,
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

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', '目前無可啟動的任務（機器不足）');
    });

    it('M2.3: Insufficient Machines - Should wait for required machines', async () => {
      // Create task type requiring 2 machines
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType._id];
      await worker.save();

      // Create only one machine
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create assigned task
      await Task.create({
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

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', '目前無可啟動的任務（機器不足）');
    });

    it('M2.4: Delayed Machine Availability - Should assign when machines become available', async () => {
      // Create task type requiring 2 machines
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType._id];
      await worker.save();

      // Create first machine
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create assigned task
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      // First attempt should fail
      const firstResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(firstResponse.status).toBe(400);
      expect(firstResponse.body).toHaveProperty('error', '目前無可啟動的任務（機器不足）');

      // Add second machine
      await Machine.create({
        machineName: 'machine2',
        machine_task_types: [taskType._id]
      });

      // Second attempt should succeed
      const secondResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.task.taskData.machine).toHaveLength(2);
    });

    it('M2.5: Machine Locked After Assignment - Should prevent double assignment', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 1
      });

      // Create workers
      const worker1 = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker1.user_task_types = [taskType._id];
      await worker1.save();

      const worker2 = await initUser({ 
        userName: 'worker2', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker2.user_task_types = [taskType._id];
      await worker2.save();

      // Create single machine
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });

      // Create two assigned tasks
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker1._id
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        taskData: {
          state: 'assigned',
          assignee_id: worker2._id
        }
      });

      // First worker starts task
      const firstResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker1._id
        });

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.task.taskData.machine).toHaveLength(1);

      // Second worker attempts to start task
      const secondResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker2._id
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toHaveProperty('error', '目前無可啟動的任務（機器不足）');
    });

    it('M2.6: Mixed-Type Machine Pool - Should wait for correct type machines', async () => {
      // Create task types
      const electricalTest = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 3
      });
      const temperatureTest = await TaskType.create({
        taskName: '溫度測試',
        number_of_machine: 1
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [electricalTest._id];
      await worker.save();

      // Create mixed machine pool
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [electricalTest._id]
      });
      await Machine.create({
        machineName: 'machine2',
        machine_task_types: [electricalTest._id]
      });
      await Machine.create({
        machineName: 'machine3',
        machine_task_types: [temperatureTest._id]
      });

      // Create assigned task
      await Task.create({
        taskTypeId: electricalTest._id,
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

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', '目前無可啟動的任務（機器不足）');
    });

    it('M2.7: Multiple Tasks, Shared Machines - Should handle concurrent requests', async () => {
      // Create task type
      const taskType = await TaskType.create({
        taskName: '電性測試',
        number_of_machine: 2
      });

      // Create workers
      const worker1 = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker1.user_task_types = [taskType._id];
      await worker1.save();

      const worker2 = await initUser({ 
        userName: 'worker2', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker2.user_task_types = [taskType._id];
      await worker2.save();

      // Create two machines
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType._id]
      });
      await Machine.create({
        machineName: 'machine2',
        machine_task_types: [taskType._id]
      });

      // Create two assigned tasks
      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker1._id
        }
      });

      await Task.create({
        taskTypeId: taskType._id,
        taskName: '電性測試-002',
        taskData: {
          state: 'assigned',
          assignee_id: worker2._id
        }
      });

      // First worker starts task
      const firstResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker1._id
        });

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.task.taskData.machine).toHaveLength(2);

      // Second worker attempts to start task
      const secondResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker2._id
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toHaveProperty('error', '目前無可啟動的任務（機器不足）');
    });

    it('M2.8: Machine Requirement Prioritization - Should try highest requirement first', async () => {
      // Create task types with different machine requirements
      const taskType3 = await TaskType.create({
        taskName: '電性測試-3機',
        number_of_machine: 3
      });
      const taskType2 = await TaskType.create({
        taskName: '電性測試-2機',
        number_of_machine: 2
      });
      const taskType1 = await TaskType.create({
        taskName: '電性測試-1機',
        number_of_machine: 1
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType3._id, taskType2._id, taskType1._id];
      await worker.save();

      // Create machines (only 2 available)
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType3._id, taskType2._id, taskType1._id]
      });
      await Machine.create({
        machineName: 'machine2',
        machine_task_types: [taskType3._id, taskType2._id, taskType1._id]
      });

      // Create tasks of different types
      await Task.create({
        taskTypeId: taskType3._id,
        taskName: '電性測試-3機-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      await Task.create({
        taskTypeId: taskType2._id,
        taskName: '電性測試-2機-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      await Task.create({
        taskTypeId: taskType1._id,
        taskName: '電性測試-1機-001',
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
      expect(response.body.task.taskName).toBe('電性測試-2機-001');
      expect(response.body.task.taskData.machine).toHaveLength(2);
    });

    it('M2.9: Machine Requirement Prioritization with Mixed Types - Should handle mixed machine types', async () => {
      // Create task types with different machine requirements
      const taskType3 = await TaskType.create({
        taskName: '電性測試-3機',
        number_of_machine: 3
      });
      const taskType2 = await TaskType.create({
        taskName: '溫度測試-2機',
        number_of_machine: 2
      });
      const taskType1 = await TaskType.create({
        taskName: '物性測試-1機',
        number_of_machine: 1
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType3._id, taskType2._id, taskType1._id];
      await worker.save();

      // Create machines with mixed capabilities
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType3._id, taskType1._id]
      });
      await Machine.create({
        machineName: 'machine2',
        machine_task_types: [taskType2._id, taskType1._id]
      });
      await Machine.create({
        machineName: 'machine3',
        machine_task_types: [taskType3._id, taskType2._id]
      });

      // Create tasks of different types
      await Task.create({
        taskTypeId: taskType3._id,
        taskName: '電性測試-3機-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      await Task.create({
        taskTypeId: taskType2._id,
        taskName: '溫度測試-2機-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      await Task.create({
        taskTypeId: taskType1._id,
        taskName: '物性測試-1機-001',
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
      expect(response.body.task.taskName).toBe('溫度測試-2機-001');
      expect(response.body.task.taskData.machine).toHaveLength(2);
    });

    it('M2.10: Machine Requirement Prioritization with Partial Availability - Should handle partial machine availability', async () => {
      // Create task types with different machine requirements
      const taskType3 = await TaskType.create({
        taskName: '電性測試-3機',
        number_of_machine: 3
      });
      const taskType2 = await TaskType.create({
        taskName: '電性測試-2機',
        number_of_machine: 2
      });
      const taskType1 = await TaskType.create({
        taskName: '電性測試-1機',
        number_of_machine: 1
      });

      // Create worker
      const worker = await initUser({ 
        userName: 'worker1', 
        password: '123456', 
        userRole: 'worker' 
      });
      worker.user_task_types = [taskType3._id, taskType2._id, taskType1._id];
      await worker.save();

      // Create machines (only 2 available)
      await Machine.create({
        machineName: 'machine1',
        machine_task_types: [taskType3._id, taskType2._id, taskType1._id]
      });
      await Machine.create({
        machineName: 'machine2',
        machine_task_types: [taskType3._id, taskType2._id, taskType1._id]
      });

      // Create tasks of different types
      await Task.create({
        taskTypeId: taskType3._id,
        taskName: '電性測試-3機-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      await Task.create({
        taskTypeId: taskType2._id,
        taskName: '電性測試-2機-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      await Task.create({
        taskTypeId: taskType1._id,
        taskName: '電性測試-1機-001',
        taskData: {
          state: 'assigned',
          assignee_id: worker._id
        }
      });

      // First attempt should start 2-machine task
      const firstResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.task.taskName).toBe('電性測試-2機-001');
      expect(firstResponse.body.task.taskData.machine).toHaveLength(2);

      // Add third machine
      await Machine.create({
        machineName: 'machine3',
        machine_task_types: [taskType3._id, taskType2._id, taskType1._id]
      });

      // finish the first task
      await Task.findByIdAndUpdate(firstResponse.body.task._id, {
        taskData: {
          state: 'success',
          endTime: new Date()
        }
      });

      // Second attempt should start 3-machine task
      const secondResponse = await request(app)
        .patch('/tasks/start-next')
        .send({
          workerId: worker._id
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.task.taskName).toBe('電性測試-3機-001');
      expect(secondResponse.body.task.taskData.machine).toHaveLength(3);
    });
  });
});
