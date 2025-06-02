import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const request = require('supertest');
const app = require('../app'); // Assuming your Express app is exported from app.js
import mongoose from 'mongoose';
const User = require('../models/User');
const TaskType = require('../models/TaskType');

describe('User API Endpoints', () => {
  let testUser;
  let testTaskType;

  beforeAll(async () => {
    // Create a test task type
    testTaskType = await TaskType.create({
      taskName: 'Test Task Type',
      number_of_machine: 1
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await TaskType.deleteMany({});
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const userData = {
        userName: 'testuser',
        password: 'password123',
        userRole: 'worker'
      };

      const response = await request(app)
        .post('/users')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.userName).toBe(userData.userName);
      expect(response.body.userRole).toBe(userData.userRole);
      expect(response.body).toHaveProperty('passwordValidate');
      expect(response.body.user_task_types).toEqual([]);

      testUser = response.body;
    });

    it('should not create user with duplicate userName', async () => {
      const userData = {
        userName: 'testuser',
        password: 'password123',
        userRole: 'worker'
      };

      const response = await request(app)
        .post('/users')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'userName 已存在');
    });

    it('should not create user with missing required fields', async () => {
      const userData = {
        userName: 'testuser2'
      };

      const response = await request(app)
        .post('/users')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /users', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/users');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('userName');
      expect(response.body[0]).toHaveProperty('userRole');
    });
  });

  describe('GET /users/with-tasks', () => {
    it('should get users with their tasks', async () => {
      const response = await request(app)
        .get('/users/with-tasks');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('assignedTasks');
      expect(response.body[0]).toHaveProperty('inProgressTasks');
      expect(response.body[0]).toHaveProperty('completedTasks');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user information', async () => {
      const updateData = {
        userName: 'updateduser',
        userRole: 'leader'
      };

      const response = await request(app)
        .put(`/users/${testUser._id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.userName).toBe(updateData.userName);
      expect(response.body.userRole).toBe(updateData.userRole);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/users/${nonExistentId}`)
        .send({ userName: 'test', userRole: 'worker' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', '找不到使用者');
    });
  });

  describe('POST /users/:id/add-task-type', () => {
    it('should add task type to user', async () => {
      const response = await request(app)
        .post(`/users/${testUser._id}/add-task-type`)
        .send({ taskTypeId: testTaskType._id });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('技能新增成功');
      expect(response.body.user.user_task_types).toContain(testTaskType._id.toString());
    });

    it('should not add duplicate task type', async () => {
      const response = await request(app)
        .post(`/users/${testUser._id}/add-task-type`)
        .send({ taskTypeId: testTaskType._id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('該技能已經加入');
    });
  });

  describe('DELETE /users/:id/remove-task-type', () => {
    it('should remove task type from user', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}/remove-task-type`)
        .send({ taskTypeId: testTaskType._id });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('技能已成功移除');
      expect(response.body.user.user_task_types).not.toContain(testTaskType._id.toString());
    });

    it('should return error when removing non-existent task type', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}/remove-task-type`)
        .send({ taskTypeId: testTaskType._id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('該技能不在使用者技能清單中');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user', async () => {
      const response = await request(app)
        .delete(`/users/${testUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('刪除成功');
      expect(response.body.deleted).toHaveProperty('_id', testUser._id);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/users/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('找不到使用者');
    });
  });
});
