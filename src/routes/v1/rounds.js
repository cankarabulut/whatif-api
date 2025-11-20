// src/routes/v1/rounds.js
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
  }),
});

function findCompetition(leagueId) {
  return competitions.find((c) => c.id === leagueId);
}

function getFixtureProviderId(competition) {
  return competition?.providers?.fixtures || 'fd';
}

function mapLeagueIdForProvider(competition, providerId, requestedLeague) {
  if (!competition) return requestedLeague;
  if (providerId === 'tsdb' && competition.external?.tsdbLeagueId) {
    return competition.external.tsdbLeagueId;
  }
  return competition.id;
}

// FD ve TSDB status değerlerini "bitmiş mi?" açısından normalize edelim
function isFinishedStatus(status) {
  if (!status) return false;
  const s = String(status).toUpperCase();

  // Football-Data
  if (['FINISHED'].includes(s)) return true;

  // TheSportsDB (Soccer) - FT, AET, PEN vb.
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(s)) return true;

  // Diğer her şey (NS, SCHEDULED, TIMED, 1H, 2H, HT, PST vs.) bitmemiş kabul
  return false;
}

router.get(
  '/',
  validate(qSchema),
  async (req, res, next) => {
    try {
      const { league, season } = req.valid.query;

      const competition = findCompetition(league);
      const providerId = getFixtureProviderId(competition);
      const leagueForProvider = mapLeagueIdForProvider(
        competition,
        providerId,
        league
      );

      const cacheKey = [
        'rounds',
        providerId,
        leagueForProvider,
        season || 'current',
      ].join(':');

      const cached = await getCache(cacheKey);
      if (cached) {
        return ok(res, cached);
      }

      const api = getProvider(providerId);
      // Tüm sezonun fixture'larını çekiyoruz (round paramı yok)
      const data = await api.fixtures({
        league: leagueForProvider,
        season,
      });

      const matches = data.matches || [];

      const roundMap = new Map(); // round -> { total, finished, upcoming }

      for (const m of matches) {
        // provider'lar round alanını numeric ya da null döndürüyor
        const rVal = m.round;
        if (rVal == null) continue;

        const r = Number(rVal);
        if (!roundMap.has(r)) {
          roundMap.set(r, { total: 0, finished: 0, upcoming: 0 });
        }
        const entry = roundMap.get(r);
        entry.total += 1;

        if (isFinishedStatus(m.status)) {
          entry.finished += 1;
        } else {
          entry.upcoming += 1;
        }
      }

      const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b);
      const seasonActive = Array.from(roundMap.values()).some(
        (info) => info.upcoming > 0
      );

      const payload = {
        league,
        season: season || data.season || null,
        provider: providerId,
        seasonActive,
        rounds: rounds.map((r) => {
          const info = roundMap.get(r);
          return {
            round: r,
            finished: info.finished,
            upcoming: info.upcoming,
            total: info.total,
          };
        }),
      };

      await setCache(cacheKey, payload);
      return ok(res, payload);
    } catch (e) {
      console.error('[rounds] error', e);
      next(e);
    }
  }
);

export default router;