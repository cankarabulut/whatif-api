// src/routes/v1/index.js
import { Router } from 'express';
import fixturesRouter from './fixtures.js';
import standingsRouter from './standings.js';
import roundsRouter from './rounds.js';
import competitionsRouter from './competitions.js';

const router = Router();

// /api/v1/fixtures
router.use('/fixtures', fixturesRouter);

// /api/v1/standings
router.use('/standings', standingsRouter);

// /api/v1/rounds
router.use('/rounds', roundsRouter);

// /api/v1/competitions
router.use('/competitions', competitionsRouter);

export default router;