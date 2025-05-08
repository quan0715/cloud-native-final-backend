const { describe, it, expect } = require('vitest');
const request = require('supertest');
const app = require('../app'); // Assuming your Express app is exported from app.js

describe('Login API', () => {
  describe('POST /login', () => {
    console.log("testing")
    it('should return 200 when valid credentials are provided', async () => {
      const validCredentials = {
        id: 'testuser',
        password: 'validpassword'
      }

      const response = await request(app)
        .post('/login')
        .send(validCredentials)

      expect(response.status).toBe(200)
    })

    it('should return 401 when invalid credentials are provided', async () => {
      const invalidCredentials = {
        id: 'testuser',
        password: 'wrongpassword'
      }

      const response = await request(app)
        .post('/login')
        .send(invalidCredentials)

      expect(response.status).toBe(401)
    })
  })
})
