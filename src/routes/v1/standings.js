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
  })
});

/**
 * @openapi
 * /api/v1/standings:
 *   get:
 *     summary: Get normalized standings table
 *     parameters:
 *       - in: query
 *         name: league
 *         required: true
 *         schema: { type: string }
 *         description: FD için lig kodu (örn. PL), AF için lig id (örn. 39)
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *         description: Sezon (örn. 2024)
 *       - in: query
 *         name: provider
 *         schema: { type: string, enum: [fd, af], default: fd }
 *         description: Veri sağlayıcısı
 *     responses:
 *       200:
 *         description: OK
 */


router.get('/', validate(qSchema), async (req, res, next) => {
  try {
    const { league, season, provider } = req.valid.query;
    const key = `standings:${provider}:${league}:${season || 'current'}`;
    const cached = await getCache(key);
    if (cached) return ok(res, cached);

    const api = getProvider();
    const data = await api.standings({ league, season });
    await setCache(key, data);
    return ok(res, data);
  } catch (e) { next(e); }
});

export default router;
