import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { getProvider } from '../../providers/index.js';
import { ok } from '../../utils/http.js';

/**
 * Logic:
 * - Fetch all fixtures for given league/season/provider
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
    provider: z.enum(['fd','af']).default('fd'),
  })
});

function parseRound(provider, round) {
  // FD: number; AF: string like "Regular Season - 12"
  if (provider === 'fd') {
    const n = Number(round);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof round === 'string') {
    const m = round.match(/(\d{1,3})/);
    return m ? Number(m[1]) : null;
  }
  const n = Number(round);
  return Number.isFinite(n) ? n : null;
}

function isFinished(provider, status) {
  // FD: FINISHED, AET, PEN; AF: FT, AET, PEN, AWD, WO
  const s = String(status).toUpperCase();
  const finishedFD = new Set(['FINISHED', 'AWARDED']); // FD may use FINISHED
  const finishedAF = new Set(['FT','AET','PEN','AWD','WO']);
  return provider === 'fd' ? finishedFD.has(s) : finishedAF.has(s);
}

function isUpcoming(provider, status) {
  const s = String(status).toUpperCase();
  const upFD = new Set(['SCHEDULED','TIMED','POSTPONED']);
  const upAF = new Set(['NS','PST','TBD']); // not started/postponed/to be decided
  return provider === 'fd' ? upFD.has(s) : upAF.has(s);
}

/**
 * @openapi
 * /api/v1/rounds:
 *   get:
 *     summary: Compute last played and active (next) round
 *     parameters:
 *       - in: query
 *         name: league
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *       - in: query
 *         name: provider
 *         schema: { type: string, enum: [fd, af], default: fd }
 *     responses:
 *       200:
 *         description: OK
 */


router.get('/', validate(qSchema), async (req, res, next) => {
  try {
    const { league, season, provider } = req.valid.query;
    const api = getProvider(provider);
    const all = await api.fixtures({ league, season }); // no round -> all fixtures we can get
    const matches = all.matches || [];

    const roundMap = new Map(); // roundNumber -> { finished: count, upcoming: count, total: count }
    for (const m of matches) {
      const rNum = parseRound(provider, m.round);
      if (rNum == null) continue;
      const bucket = roundMap.get(rNum) || { finished: 0, upcoming: 0, total: 0 };
      if (isFinished(provider, m.status)) bucket.finished += 1;
      else if (isUpcoming(provider, m.status)) bucket.upcoming += 1;
      bucket.total += 1;
      roundMap.set(rNum, bucket);
    }

    const rounds = Array.from(roundMap.keys()).sort((a,b)=>a-b);
    const lastPlayed = rounds
      .filter(r => (roundMap.get(r)?.finished || 0) > 0)
      .slice(-1)[0] ?? null;

    // active = first upcoming round strictly greater than lastPlayed, else first upcoming
    const upcomingRounds = rounds.filter(r => (roundMap.get(r)?.upcoming || 0) > 0);
    let active = null;
    if (upcomingRounds.length > 0) {
      const gt = upcomingRounds.filter(r => lastPlayed == null || r > lastPlayed).sort((a,b)=>a-b);
      active = (gt[0] != null) ? gt[0] : upcomingRounds.sort((a,b)=>a-b)[0];
    }

    const seasonActive = active != null;

    return ok(res, {
      league,
      season: season || all.season || null,
      provider,
      lastPlayed,
      active,        // "aktif hafta": lastPlayed'dan sonraki ilk upcoming
      seasonActive,
      rounds: rounds.map(r => ({
        round: r,
        finished: roundMap.get(r).finished,
        upcoming: roundMap.get(r).upcoming,
        total: roundMap.get(r).total,
      })),
    });
  } catch (e) { next(e); }
});

export default router;
