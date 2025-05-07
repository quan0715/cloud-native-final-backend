// swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mini Lab Task Management API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js'], // 掃描 routes 裡的註解
};

module.exports = swaggerJSDoc(options);
