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

// Varsa utcDate ms olarak döndür, yoksa null
function matchUtcMs(match) {
  const d = match?.utcDate || match?.date || match?.kickoff;
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Aktif round seçimi (öncelik sırası):
 *  1. finished > 0 && upcoming > 0 olan round'lar arasından, firstMatchUtc'si
 *     şu ana en yakın olanı seç (maçhaftası ortasındaki gerçek aktif hafta).
 *  2. Hepsi gelecekte olan round'lar arasından, firstMatchUtc'si en küçük olan
 *     (sıradaki oynanacak hafta).
 *  3. Tüm maçlar geçmişte kaldıysa en büyük round numarası (sezon bitmiş).
 *  4. Round bilgisi yoksa null.
 */
function pickActiveRound(roundMap, now = Date.now()) {
  const entries = Array.from(roundMap.entries()).sort((a, b) => a[0] - b[0]);
  if (!entries.length) return null;

  // 1) Hem bitmiş hem oynanmamış maçı olan round'lar
  const mixed = entries.filter(([, info]) => info.finished > 0 && info.upcoming > 0);
  if (mixed.length > 0) {
    mixed.sort((a, b) => {
      const da = a[1].firstMatchUtc != null ? Math.abs(a[1].firstMatchUtc - now) : Number.POSITIVE_INFINITY;
      const db = b[1].firstMatchUtc != null ? Math.abs(b[1].firstMatchUtc - now) : Number.POSITIVE_INFINITY;
      return da - db;
    });
    return mixed[0][0];
  }

  // 2) Hepsi gelecekte olan (ilk maçı >= now) round'lar → en yakın
  const future = entries.filter(
    ([, info]) => info.firstMatchUtc != null && info.firstMatchUtc >= now
  );
  if (future.length > 0) {
    future.sort((a, b) => a[1].firstMatchUtc - b[1].firstMatchUtc);
    return future[0][0];
  }

  // 3) Tümü geçmişte → son round
  return entries[entries.length - 1][0];
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

      // round -> { total, finished, upcoming, firstMatchUtc, lastMatchUtc }
      const roundMap = new Map();

      for (const m of matches) {
        // provider'lar round alanını numeric ya da null döndürüyor
        const rVal = m.round;
        if (rVal == null) continue;

        const r = Number(rVal);
        if (!Number.isFinite(r)) continue;

        if (!roundMap.has(r)) {
          roundMap.set(r, {
            total: 0,
            finished: 0,
            upcoming: 0,
            firstMatchUtc: null,
            lastMatchUtc: null,
          });
        }
        const entry = roundMap.get(r);
        entry.total += 1;

        if (isFinishedStatus(m.status)) {
          entry.finished += 1;
        } else {
          entry.upcoming += 1;
        }

        const ts = matchUtcMs(m);
        if (ts != null) {
          if (entry.firstMatchUtc == null || ts < entry.firstMatchUtc) entry.firstMatchUtc = ts;
          if (entry.lastMatchUtc == null || ts > entry.lastMatchUtc) entry.lastMatchUtc = ts;
        }
      }

      const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b);
      const seasonActive = Array.from(roundMap.values()).some(
        (info) => info.upcoming > 0
      );
      const activeRound = pickActiveRound(roundMap);

      const payload = {
        league,
        season: season || data.season || null,
        provider: providerId,
        seasonActive,
        activeRound,
        rounds: rounds.map((r) => {
          const info = roundMap.get(r);
          return {
            round: r,
            finished: info.finished,
            upcoming: info.upcoming,
            total: info.total,
            firstMatchUtc: info.firstMatchUtc != null ? new Date(info.firstMatchUtc).toISOString() : null,
            lastMatchUtc: info.lastMatchUtc != null ? new Date(info.lastMatchUtc).toISOString() : null,
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
