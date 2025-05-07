const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Workers
 *   description: Worker management
 */

/**
 * @swagger
 * /workers:
 *   get:
 *     summary: Get all workers
 *     tags: [Workers]
 *     responses:
 *       200:
 *         description: List of workers
 */
router.get('/', (req, res) => {
  res.json([{ id: 'A', skills: ['temperature', 'electrical'] }]);
});

module.exports = router;