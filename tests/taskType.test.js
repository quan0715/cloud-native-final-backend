import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
const TaskType = require("../models/TaskType");
// const TaskType = require("../models/TaskType");

describe('/task-types API', () => {
  // Clean up TaskType collection before each test
  beforeEach(async () => {
    const deleted = await TaskType.deleteMany({});
    console.log(`Cleared TaskType collection, deleted count: ${deleted.deletedCount}`);
  });
  
  it('should create a new task type', async () => {
    const res = await request(app)
      .post('/task-types')
      .send({ taskName: '測試任務類型A', number_of_machine: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.taskName).toBe('測試任務類型A');
    expect(res.body.number_of_machine).toBe(2);
  });

  it('should not create a task type with duplicate taskName', async () => {
    await request(app)
      .post('/task-types')
      .send({ taskName: '測試任務類型A', number_of_machine: 2 });
    const res = await request(app)
      .post('/task-types')
      .send({ taskName: '測試任務類型A', number_of_machine: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('taskName 已存在');
  });

  it('should get all task types', async () => {
    await request(app)
      .post('/task-types')
      .send({ taskName: '測試任務類型A', number_of_machine: 1 });
    await request(app)
      .post('/task-types')
      .send({ taskName: '測試任務類型B', number_of_machine: 2 });
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
      .send({ taskName: '測試任務類型C', number_of_machine: 1 });

    const id = createRes.body._id;
    const UpdateRes = await request(app)
      .put(`/task-types/${id}`)
      .send({ taskName: '測試任務類型C-updated', number_of_machine: 3 });
    expect(UpdateRes.status).toBe(200);
    expect(UpdateRes.body.taskName).toBe('測試任務類型C-updated');
    expect(UpdateRes.body.number_of_machine).toBe(3);

    const res = await request(app).get('/task-types');
    expect(res.body.length).toBe(1);
    expect(res.body[0].taskName).toBe('測試任務類型C-updated');
    expect(res.body[0]._id).toBe(String(id));
    expect(res.body[0].number_of_machine).toBe(3);
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
      .send({ taskName: '物性測試', number_of_machine: 1 });
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


  it('B.TT.1: should handle missing task name', async () => {
    const response = await request(app)
      .post('/task-types')
      .send({
        number_of_machine: 1
      });
    expect(response.status).toBe(400); // Mongoose validation error
  });
  it('B.TT.2: should handle missing machine requirements', async () => {
    const response = await request(app)
      .post('/task-types')
      .send({
        taskName: '缺少機器數量'
      });
    expect(response.status).toBe(400); // Mongoose validation error
  });
  it('B.TT.3: should handle too short task name', async () => {
    const response = await request(app)
      .post('/task-types')
      .send({
        taskName: 'A', // Too short
        number_of_machine: 1
      });
    expect(response.status).toBe(500); // Mongoose validation error
  });

  it('B.TT.4: should handle too long task name', async () => {
    const response = await request(app)
      .post('/task-types')
      .send({
        taskName: 'A'.repeat(51), // Too long
        number_of_machine: 1
      });
    expect(response.status).toBe(500); // Mongoose validation error
  });
  it('B.TT.5: should handle zero machine requirements', async () => {
    const response = await request(app)
      .post('/task-types')
      .send({
        taskName: '零機器測試',
        number_of_machine: 0
      });
    expect(response.status).toBe(500); // Mongoose validation error (min: 1)
  });
  it('B.TT.6: should handle too much machine requirements', async () => {
    const response = await request(app)
      .post('/task-types')
      .send({
        taskName: '過多機器測試',
        number_of_machine: 21
      });
    expect(response.status).toBe(500); // Mongoose validation error
  });
  it('B.TT.7: should handle wrong format machine requirements', async () => {
    const response = await request(app)
      .post('/task-types')
      .send({
        taskName: '格式錯誤測試',
        number_of_machine: 'two' // Non-integer value
      });
    expect(response.status).toBe(400); // Mongoose validation error
  });
});
