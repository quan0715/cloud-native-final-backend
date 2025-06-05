import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
const TaskType = require("../models/TaskType");
const Machine = require("../models/Machine");
const Task = require("../models/Task");

// Helper to clear collections
async function clearDB() {
  await Task.deleteMany({});
  await Machine.deleteMany({});
  await TaskType.deleteMany({});
}

describe('/machines API', () => {
  let taskType;

  beforeEach(async () => {
    await clearDB();
    taskType = await TaskType.create({
      taskName: '測試任務類型',
      number_of_machine: 2,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a machine', async () => {
    const res = await request(app)
      .post('/machines')
      .send({
        machineName: 'GPU-01',
        machine_task_types: [taskType._id],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.machineName).toBe('GPU-01');
    expect(res.body.machine_task_types[0]).toBe(String(taskType._id));
  });

  it('should not create a machine with duplicate name', async () => {
    await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    const res = await request(app)
      .post('/machines')
      .send({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/已存在/);
  });

  it('should get all machines', async () => {
    await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    const res = await request(app).get('/machines');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].machineName).toBe('GPU-01');
  });

  it('should get a single machine by id', async () => {
    const machine = await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    const res = await request(app).get(`/machines/${machine._id}`);
    expect(res.status).toBe(200);
    expect(res.body.machineName).toBe('GPU-01');
    expect(res.body.machine_task_types[0]._id).toBe(String(taskType._id));
    expect(res.body.status).toBe("idle");
  });

  it('should return 404 for non-existent machine', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/machines/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/找不到/);
  });

  it('should update a machine', async () => {
    const machine = await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    const newTaskType = await TaskType.create({ taskName: '新任務', number_of_machine: 1 });
    const res = await request(app)
      .put(`/machines/${machine._id}`)
      .send({ machineName: 'GPU-02', machine_task_types: [newTaskType._id] });
    expect(res.status).toBe(200);
    expect(res.body.machineName).toBe('GPU-02');
    expect(res.body.machine_task_types[0]._id).toBe(String(newTaskType._id));
  });

  it('should return 404 when updating non-existent machine', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/machines/${fakeId}`)
      .send({ machineName: 'GPU-03', machine_task_types: [] });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/找不到/);
  });

  it('should delete a machine', async () => {
    const machine = await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    const res = await request(app).delete(`/machines/${machine._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/刪除成功/);

    const check = await Machine.findById(machine._id);
    expect(check).toBeNull();
  });

  it('should return 404 when deleting non-existent machine', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/machines/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/找不到/);
  });

  it('B.M.1: should handle machine name too short', async () => {
    const res = await request(app)
      .post('/machines')
      .send({ machineName: 'A', machine_task_types: [taskType._id] });
    expect(res.status).toBe(500);
  });

  it('B.M.2: should handle machine name too long', async () => {
    const longMachineName = 'A'.repeat(51); // 51 characters
    const res = await request(app)
      .post('/machines')
      .send({ machineName: longMachineName, machine_task_types: [taskType._id] });
    expect(res.status).toBe(500);
  });

  it('B.M.3: should return 400 for invalid machine data', async () => {
    const res = await request(app)
      .post('/machines')
      .send({ machineName: '', machine_task_types: [] });
    expect(res.status).toBe(400);
  });

  it('B.M.4: should return 400 for invalid task type reference', async () => {
    const fakeTaskTypeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/machines')
      .send({
        machineName: 'GPU-02',
        machine_task_types: [fakeTaskTypeId],
      });
    expect(res.status).toBe(400);
  });

  it('B.M.5: should return 201 for empty task type reference', async () => {
    const res = await request(app)
      .post('/machines')
      .send({
        machineName: 'GPU-02',
        machine_task_types: [],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.machineName).toBe('GPU-02');
    expect(res.body.machine_task_types).toStrictEqual([]);
  });

  it('B.M.6: should return 400 for wrong data type in machine_task_types during update', async () => {
    // 送 PUT /machines/:id，但 machine_task_types 用字串而非陣列
    const machine = await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    const res = await request(app)
      .put(`/machines/${machine._id}`)
      .send({ machineName: 'GPU-02', machine_task_types: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/machine_task_types 必須是陣列/);
  });

  it('B.M.7: should return 400 for wrong task type id in machine_task_types during update', async () => {
    const fakeTaskTypeId = new mongoose.Types.ObjectId();
    const machine = await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });
    const res = await request(app)
      .put(`/machines/${machine._id}`)
      .send({
        machineName: 'GPU-UPDATED',
        machine_task_types: [fakeTaskTypeId],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/部分 taskTypeId 不存在/);
  });

  // New tests for GET "/" route
  it('should return 500 when Task.find throws an error', async () => {
    // Stub Task.find to throw
    const errorMsg = 'DB failure';
    const findSpy = vi.spyOn(Task, 'find').mockImplementation(() => {
      throw new Error(errorMsg);
    });

    const res = await request(app).get('/machines');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: errorMsg });

    findSpy.mockRestore();
  });

  it('should return 500 when Machine.findById throws an error', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const findByIdSpy = vi
      .spyOn(Machine, 'findById')
      .mockImplementation(() => { throw new Error('DB failure'); });

    const res = await request(app).get(`/machines/${fakeId}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'DB failure' });

    findByIdSpy.mockRestore();
  });

  it('should return 500 when TaskType.find throws an error during update', async () => {
    // Stub TaskType.find to throw
    const errorMsg = 'TaskType DB error';
    const findSpy = vi.spyOn(TaskType, 'find').mockRejectedValue(new Error(errorMsg));
    const machine = await Machine.create({ machineName: 'GPU-01', machine_task_types: [taskType._id] });

    const res = await request(app)
      .put(`/machines/${machine._id}`)
      .send({
        machineName: 'GPU-UPDATED',
        machine_task_types: [taskType._id],
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: errorMsg });

    findSpy.mockRestore();
  });

  it('should return 500 when Machine.findByIdAndDelete throws an error', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const findByIdAndDeleteSpy = vi
      .spyOn(Machine, 'findByIdAndDelete')
      .mockImplementation(() => { throw new Error('DB failure'); });

    const res = await request(app).delete(`/machines/${fakeId}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'DB failure' });

    findByIdAndDeleteSpy.mockRestore();
  });

  it('should correctly identify machines in use', async () => {
    // 建立測試機器
    const machine1 = await Machine.create({ 
      machineName: 'GPU-01', 
      machine_task_types: [taskType._id] 
    });
    const machine2 = await Machine.create({ 
      machineName: 'GPU-02', 
      machine_task_types: [taskType._id] 
    });

    // 建立進行中的任務
    await Task.create({
      taskName: '測試機器狀態任務',
      taskTypeId: taskType._id,  // 修正：加入 taskTypeId
      taskType: taskType._id,
      taskData: {
        state: 'in-progress',
        machine: [machine1._id]
      }
    });

    const res = await request(app).get('/machines');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    
    // 驗證機器狀態
    const machine1Response = res.body.find(m => m._id === machine1.id);
    const machine2Response = res.body.find(m => m._id === machine2.id);
    
    expect(machine1Response.status).toBe('in-use');
    expect(machine2Response.status).toBe('idle');
  });

  it('should handle multiple tasks using same machine', async () => {
    const machine = await Machine.create({ 
      machineName: 'GPU-01', 
      machine_task_types: [taskType._id] 
    });

    // 建立多個使用相同機器的任務
    await Task.create([
      {
        taskName: '任務1',
        taskTypeId: taskType._id,  // 修正：加入 taskTypeId
        taskType: taskType._id,
        taskData: {
          state: 'in-progress',
          machine: [machine._id]
        }
      },
      {
        taskName: '任務2',
        taskTypeId: taskType._id,  // 修正：加入 taskTypeId
        taskType: taskType._id,
        taskData: {
          state: 'in-progress',
          machine: [machine._id]
        }
      }
    ]);

    const res = await request(app).get('/machines');
    
    expect(res.status).toBe(200);
    const machineResponse = res.body.find(m => m._id === machine.id);
    expect(machineResponse.status).toBe('in-use');
  });

  it('should return machine with in-use status when machine has running task', async () => {
    // 建立測試機器
    const machine = await Machine.create({ 
      machineName: 'GPU-01', 
      machine_task_types: [taskType._id] 
    });

    // 建立進行中的任務
    await Task.create({
      taskName: '測試',
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
      taskName: '測試-完成',
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
