import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
const TaskType = require("../models/TaskType");
// const TaskType = require("../models/TaskType");

// Clean up TaskType collection before each test
beforeEach(async () => {
  await TaskType.deleteMany({});
});

describe('/task-types API', () => {
  it('should create a new task type', async () => {
    const res = await request(app)
      .post('/task-types')
      .send({ taskName: '電性測試', number_of_machine: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.taskName).toBe('電性測試');
    expect(res.body.number_of_machine).toBe(2);
  });

  it('should not create a task type with duplicate taskName', async () => {
    await request(app)
      .post('/task-types')
      .send({ taskName: '電性測試', number_of_machine: 2 });
    const res = await request(app)
      .post('/task-types')
      .send({ taskName: '電性測試', number_of_machine: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('taskName 已存在');
  });

  it('should not create a task type with missing fields', async () => {
    const res = await request(app)
      .post('/task-types')
      .send({ taskName: '缺少機器數量' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('taskName 與 number_of_machine 為必填');
  });

  it('should get all task types', async () => {
    await request(app)
      .post('/task-types')
      .send({ taskName: 'A', number_of_machine: 1 });
    await request(app)
      .post('/task-types')
      .send({ taskName: 'B', number_of_machine: 2 });
    const res = await request(app).get('/task-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('taskName');
    expect(res.body[0]).toHaveProperty('number_of_machine');
  });

  it('should update a task type', async () => {
    const createRes = await request(app)
      .post('/task-types')
      .send({ taskName: 'C', number_of_machine: 1 });
    const id = createRes.body._id;
    const res = await request(app)
      .put(`/task-types/${id}`)
      .send({ taskName: 'C-updated', number_of_machine: 3 });
    expect(res.status).toBe(200);
    expect(res.body.taskName).toBe('C-updated');
    expect(res.body.number_of_machine).toBe(3);
  });

  it('should return 404 when updating non-existent task type', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/task-types/${fakeId}`)
      .send({ taskName: 'notfound', number_of_machine: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('TaskType 不存在');
  });

  it('should delete a task type', async () => {
    const createRes = await request(app)
      .post('/task-types')
      .send({ taskName: 'D', number_of_machine: 1 });
    const id = createRes.body._id;
    const res = await request(app).delete(`/task-types/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('刪除成功');
    // Confirm deletion
    const getRes = await request(app).get('/task-types');
    expect(getRes.body.find(t => t._id === id)).toBeUndefined();
  });

  it('should return 404 when deleting non-existent task type', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/task-types/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('TaskType 不存在');
  });
});
