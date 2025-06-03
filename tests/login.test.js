import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../app' // Assuming your Express app is exported from app.js
const User = require('../models/User');
import { initUser } from './globalSetup';

describe('Login API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await initUser({ userName: 'leader001', password: '123456', userRole: 'leader' });
    await initUser({ userName: 'admin001', password: '123456', userRole: 'admin' });
    await initUser({ userName: 'worker001', password: '123456', userRole: 'worker' });
  });
  describe('POST /auth/login', () => {
    it('should return 200 when valid credentials are provided', async () => {
      const validCredentials = {
        userName: 'leader001',
        password: '123456'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials)
      console.log(response.body)
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('role')
      expect(response.body.message).toBe('Login Successful!')
    })

    it('should return 200 and correct role for admin user', async () => {
      const adminCredentials = {
        userName: 'admin001',
        password: '123456'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(adminCredentials)
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body.role).toBe('admin')
      expect(response.body.message).toBe('Login Successful!')
    })

    it('should return 200 and correct role for leader user', async () => {
      const leaderCredentials = {
        userName: 'leader001',
        password: '123456'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(leaderCredentials)
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body.role).toBe('leader')
      expect(response.body.message).toBe('Login Successful!')
    })

    it('should return 200 and correct role for worker user', async () => {
      const workerCredentials = {
        userName: 'worker001',
        password: '123456'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(workerCredentials)
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body.role).toBe('worker')
      expect(response.body.message).toBe('Login Successful!')
    })

    it('should return 401 when invalid credentials are provided', async () => {
      const invalidCredentials = {
        userName: 'leader001',
        password: '1234567'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(invalidCredentials)

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Password Error')
    })

    it('should return 401 when user is not found', async () => {
      const nonExistentUserCredentials = {
        userName: 'nonexistentuser',
        password: 'password123'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(nonExistentUserCredentials)

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('User Not Found')
    })

    // 模擬 User.findOne 拋錯 → 走到 catch
    it('should return 500 when User.findOne throws an error', async () => {
      // Stub User.findOne，讓它拋出一個錯誤
      const errorMsg = 'Database down'
      const findOneSpy = vi
        .spyOn(User, 'findOne')
        .mockImplementation(() => {
          throw new Error(errorMsg)
        })

      // Call endpoint
      const response = await request(app)
        .post('/auth/login')
        .send({ userName: 'worker001', password: '123456' })

      // 驗證回傳狀態與內容
      expect(response.status).toBe(500)
      expect(response.body).toEqual({ message: 'Internal Server Error' })

      // 最後記得還原 stub
      findOneSpy.mockRestore();
    });
  });
});
