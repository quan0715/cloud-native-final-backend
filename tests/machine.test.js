import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
const TaskType = require("../models/TaskType");
const Machine = require("../models/Machine");

// Helper to clear collections
async function clearDB() {
  await Machine.deleteMany({});
  await TaskType.deleteMany({});
}

describe('/machines API', () => {
  let taskType;

  beforeEach(async () => {
    await clearDB();
    taskType = await TaskType.create({
      taskName: '測試任務',
      number_of_machine: 2,
    });
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
});
