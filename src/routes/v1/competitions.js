import { Router } from 'express';
import { ok } from '../../utils/http.js';
const router = Router();

router.get('/', async (req, res) => {
  return ok(res, [{ code: 'PL', name: 'Premier League' }]);
});

export default router;
