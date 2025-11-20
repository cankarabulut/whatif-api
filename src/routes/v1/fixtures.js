import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { getCache, setCache } from '../../middleware/cache.js';
import { getProvider } from '../../providers/index.js';
import competitions from '../../config/competitions.json' assert { type: 'json' };
import { ok } from '../../utils/http.js';

const router = Router();

const qSchema = z.object({
  query: z.object({
    league: z.string().min(1),
    season: z.string().optional(),
    round: z.string().optional(),
  }),
});

/**
 * Belirli bir league id için competitions.json içinden config bul
 */
function findCompetition(leagueId) {
  return competitions.find((c) => c.id === leagueId);
}

/**
 * Provider seçimi: competitions.providers.fixtures yoksa default 'fd'
 */
function getFixtureProviderId(competition) {
  return competition?.providers?.fixtures || 'fd';
}

/**
 * Provider’a geçecek league id:
 *  - FD için: direkt competition.id
 *  - TSDB için: external.tsdbLeagueId varsa onu, yoksa competition.id
 */
function mapLeagueIdForProvider(competition, providerId, requestedLeague) {
  if (!competition) return requestedLeague;
  if (providerId === 'tsdb' && competition.external?.tsdbLeagueId) {
    return competition.external.tsdbLeagueId;
  }
  return competition.id;
}

router.get(
  '/',
  validate(qSchema),
  async (req, res, next) => {
    try {
      const { league, season, round } = req.valid.query;

      const competition = findCompetition(league);
      const providerId = getFixtureProviderId(competition);
      const leagueForProvider = mapLeagueIdForProvider(
        competition,
        providerId,
        league
      );

      const cacheKey = [
        'fixtures',
        providerId,
        leagueForProvider,
        season || 'current',
        round || 'all',
      ].join(':');

      const cached = await getCache(cacheKey);
      if (cached) {
        return ok(res, cached);
      }

      const api = getProvider(providerId);
      const data = await api.fixtures({
        league: leagueForProvider,
        season,
        round,
      });

      const normalized = {
        ...data,
        // response içinde league alanını tekrar INTERNAL id ile set edelim
        league,
        provider: providerId,
      };

      console.log('FIXTURES API CALL =>', {
        provider: providerId,
        league,
        leagueForProvider,
        season: normalized.season,
        round: normalized.round,
        matches: normalized?.matches?.length,
      });

      await setCache(cacheKey, normalized);
      return ok(res, normalized);
    } catch (e) {
      console.error('FIXTURES ERROR =>', e);
      next(e);
    }
  }
);

export default router;