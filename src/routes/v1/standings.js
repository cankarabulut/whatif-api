import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { getCache, setCache } from '../../middleware/cache.js';
import { getProvider } from '../../providers/index.js';
import { ok } from '../../utils/http.js';

const router = Router();

const qSchema = z.object({
  query: z.object({
    league: z.string().min(1),
    season: z.string().optional(),
  }),
});

/**
 * @openapi
 * /api/v1/standings:
 *   get:
 *     summary: Get league table / standings
 *     parameters:
 *       - in: query
 *         name: league
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', validate(qSchema), async (req, res, next) => {
  try {
    const { league, season } = req.valid.query;
    const cacheKey = `standings:fd:${league}:${season || 'current'}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return ok(res, cached);
    }

    const api = getProvider(); // şu an sadece FD
    const data = await api.standings({ league, season });

    await setCache(cacheKey, data);
    return ok(res, data);
  } catch (e) {
    console.error('[standings] error', e);
    next(e);
  }
});

export default router;