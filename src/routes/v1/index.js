import { Router } from 'express';
import standings from './standings.js';
import fixtures from './fixtures.js';
import competitions from './competitions.js';
import rounds from './rounds.js';

const api = Router();
api.use('/standings', standings);
api.use('/fixtures', fixtures);
api.use('/competitions', competitions);
api.use('/rounds', rounds);

export default api;
