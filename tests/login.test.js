import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app' // Assuming your Express app is exported from app.js

describe('Login API', () => {
  describe('POST /auth/login', () => {
    it('should return 200 when valid credentials are provided', async () => {
      const validCredentials = {
        id: 'leader001',
        password: '123456'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(validCredentials)
      console.log(response.body)
      expect(response.status).toBe(200)
    })

    it('should return 401 when invalid credentials are provided', async () => {
      const invalidCredentials = {
        id: 'leader001',
        password: '1234567'
      }

      const response = await request(app)
        .post('/auth/login')
        .send(invalidCredentials)

      expect(response.status).toBe(401)
    })
  })
})
