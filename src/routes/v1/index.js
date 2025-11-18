import { Router } from 'express';
import standings from './standings.js';
import fixtures from './fixtures.js';
import competitions from './competitions.js';
import rounds from './rounds.js';

/* const api = Router();
api.use('/standings', standings);
api.use('/fixtures', fixtures);
api.use('/competitions', competitions);
api.use('/rounds', rounds);

export default api;
 */

// src/routes/v1/index.js
import { Router } from 'express';
import fixturesRouter from './fixtures.js';
import standingsRouter from './standings.js';
import competitionsRouter from './competitions.js';

const router = Router();

router.use('/fixtures', fixturesRouter);
router.use('/standings', standingsRouter);
router.use('/competitions', competitionsRouter);

export default router;




