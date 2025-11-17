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
    round: z.string().optional(),
    provider: z.enum(['fd','af']).default('fd'),
  })
});

/**
 * @openapi
 * /api/v1/fixtures:
 *   get:
 *     summary: Get fixtures (optionally by round)
 *     parameters:
 *       - in: query
 *         name: league
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *       - in: query
 *         name: round
 *         schema: { type: string }
 *         description: FD için sayısal matchday; AF için "Regular Season - 12" gibi
 *       - in: query
 *         name: provider
 *         schema: { type: string, enum: [fd, af], default: fd }
 *     responses:
 *       200:
 *         description: OK
 */


router.get('/', validate(qSchema), async (req, res, next) => {
  try {
    // 🔍 Debug loglar — sadece ne geldiğini görmek için
    console.log('FIXTURES RAW QUERY =>', req.query);
    console.log('FIXTURES VALID QUERY =>', req.valid?.query);

    const { league, season, round, provider } = req.valid.query;

    const key = `fixtures:${provider}:${league}:${season || 'current'}:${round || 'all'}`;
    const cached = await getCache(key);
    if (cached) {
      console.log('FIXTURES CACHE HIT =>', key);
      return ok(res, cached);
    }

    const api = getProvider(provider);
    const data = await api.fixtures({ league, season, round });

    console.log('FIXTURES API CALL =>', { provider, league, season, round, matches: data?.matches?.length });

    await setCache(key, data);
    return ok(res, data);
  } catch (e) {
    console.error('FIXTURES ERROR =>', e);
    next(e);
  }
});

export default router;
