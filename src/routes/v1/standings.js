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
    provider: z.enum(['fd', 'tsdb']).optional(),
  }),
});

function findCompetition(leagueId) {
  return competitions.find((c) => c.id === leagueId);
}

function getStandingsProviderId(competition) {
  return competition?.providers?.standings || 'fd';
}

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
      const { league, season, provider } = req.valid.query;

      const competition = findCompetition(league);
      const preferredProvider = provider || getStandingsProviderId(competition);
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
            'standings',
            providerId,
            leagueForProvider,
            season || 'current',
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
          const data = await api.standings({
            league: leagueForProvider,
            season,
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

      throw new Error(`All providers failed for standings. ${errors.join(' | ')}`);
    } catch (e) {
      console.error('[standings] error', e);
      next(e);
    }
  }
);

export default router;