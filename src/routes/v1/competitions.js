// src/routes/v1/competitions.js
import { Router } from 'express';
import competitions from '../../config/competitions.json' assert { type: 'json' };
import { ok } from '../../utils/http.js';

const router = Router();

/**
 * @openapi
 * /api/v1/competitions:
 *   get:
 *     summary: List all competitions (leagues & cups)
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', (req, res) => {
  // İleride burada filtre (type, area vs.) de destekleyebiliriz
  ok(res, competitions);
});

export default router;
