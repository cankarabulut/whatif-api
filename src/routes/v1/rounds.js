import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { getProvider } from '../../providers/index.js';
import { ok } from '../../utils/http.js';

/**
 * Logic:
 * - Fetch all fixtures for given league/season
 * - Determine lastPlayedRound (max round with any finished match)
 * - Determine nextActiveRound (min upcoming round > lastPlayedRound)
 * - If no upcoming -> seasonActive=false, active=null
 * - Return { lastPlayed, active, seasonActive, rounds }
 */
const router = Router();

const qSchema = z.object({
  query: z.object({
    league: z.string().min(1),
    season: z.string().optional(),
  }),
});

/**
 * @openapi
 * /api/v1/rounds:
 *   get:
 *     summary: Get round / matchday info for league+season
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
    const api = getProvider();

    const fixturesData = await api.fixtures({ league, season });
    const matches = fixturesData.matches || [];

    // Round -> { finished, upcoming, total }
    const roundMap = new Map();

    for (const m of matches) {
      const r = Number(m.round || m.matchday || 0);
      if (!r) continue;

      if (!roundMap.has(r)) {
        roundMap.set(r, { finished: 0, upcoming: 0, total: 0 });
      }
      const info = roundMap.get(r);
      info.total += 1;

      const status = (m.status || '').toUpperCase();
      const finishedStatuses = ['FINISHED']; // istersen 'AWARDED' vs ekleyebilirsin
      const upcomingStatuses = ['SCHEDULED', 'TIMED'];

      if (finishedStatuses.includes(status)) {
        info.finished += 1;
      } else if (upcomingStatuses.includes(status)) {
        info.upcoming += 1;
      }
    }

    const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b);

    let lastPlayed = null;
    let active = null;
    let seasonActive = false;

    for (const r of rounds) {
      const info = roundMap.get(r);
      if (info.finished > 0) {
        lastPlayed = r;
      }
    }

    if (lastPlayed != null) {
      const upcomingAfter = rounds.filter(
        (r) => r > lastPlayed && roundMap.get(r).upcoming > 0
      );
      if (upcomingAfter.length > 0) {
        active = upcomingAfter[0];
        seasonActive = true;
      } else {
        // bütün maçlar oynanmış
        seasonActive = false;
        active = null;
      }
    } else {
      // hiç maç oynanmamış, ilk upcoming "active" olsun
      const upcomingAll = rounds.filter(
        (r) => roundMap.get(r).upcoming > 0
      );
      if (upcomingAll.length > 0) {
        active = upcomingAll[0];
        seasonActive = true;
      }
    }

    return ok(res, {
      league,
      season: season || fixturesData.season,
      lastPlayed,
      active,
      seasonActive,
      rounds: rounds.map((r) => ({
        round: r,
        finished: roundMap.get(r).finished,
        upcoming: roundMap.get(r).upcoming,
        total: roundMap.get(r).total,
      })),
    });
  } catch (e) {
    console.error('[rounds] error', e);
    next(e);
  }
});

export default router;