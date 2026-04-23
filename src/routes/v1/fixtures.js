import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { getCache, setCache } from '../../middleware/cache.js';
import { getProvider, getProviderCandidates } from '../../providers/index.js';
import competitions from '../../config/competitions.json' assert { type: 'json' };
import { ok } from '../../utils/http.js';

const router = Router();

const qSchema = z.object({
  query: z.object({
    league: z.string().min(1),
    season: z.string().optional(),
    round: z.string().optional(),
    provider: z.enum(['fd', 'tsdb']).optional(),
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
      const { league, season, round, provider } = req.valid.query;

      const competition = findCompetition(league);
      const preferredProvider = provider || getFixtureProviderId(competition);
      const providerCandidates = getProviderCandidates(preferredProvider);
      const errors = [];

      for (const providerId of providerCandidates) {
        try {
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
            return ok(res, {
              ...cached,
              providerRequested: preferredProvider,
              providerFallback: providerId !== preferredProvider,
            });
          }

          const api = getProvider(providerId);
          const data = await api.fixtures({
            league: leagueForProvider,
            season,
            round,
          });

          const normalized = {
            ...data,
            league,
            provider: providerId,
            providerRequested: preferredProvider,
            providerFallback: providerId !== preferredProvider,
          };

          await setCache(cacheKey, normalized);
          return ok(res, normalized);
        } catch (providerErr) {
          errors.push(`${providerId}: ${providerErr.message}`);
        }
      }

      throw new Error(`All providers failed for fixtures. ${errors.join(' | ')}`);
    } catch (e) {
      console.error('FIXTURES ERROR =>', e);
      next(e);
    }
  }
);

export default router;