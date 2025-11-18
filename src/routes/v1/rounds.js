// src/routes/v1/rounds.js
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
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
    const api = getProvider(); // şu an sadece FD

    const fixturesData = await api.fixtures({ league, season });
    const matches = fixturesData.matches || [];

    // Round -> { finished, upcoming, total }
    const roundMap = new Map();

    // FD status'ları:
    // SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, SUSPENDED, CANCELED
    const finishedStatuses = ['FINISHED'];
    // "gelecek/aktif" sayacağımız statüler:
    const upcomingStatuses = [
      'SCHEDULED',
      'TIMED',
      'IN_PLAY',
      'PAUSED',
      'POSTPONED',
      'SUSPENDED',
    ];

    for (const m of matches) {
      const r = Number(m.round || m.matchday || 0);
      if (!r) continue;

      if (!roundMap.has(r)) {
        roundMap.set(r, { finished: 0, upcoming: 0, total: 0 });
      }
      const info = roundMap.get(r);
      info.total += 1;

      const status = String(m.status || '').toUpperCase();

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

    // En son bitmiş haftayı bul
    for (const r of rounds) {
      const info = roundMap.get(r);
      if (info.finished > 0) {
        lastPlayed = r;
      }
    }

    if (lastPlayed != null) {
      // lastPlayed'den sonra en yakın upcoming haftayı "active" kabul et
      const upcomingAfter = rounds.filter(
        (r) => r > lastPlayed && roundMap.get(r).upcoming > 0
      );

      if (upcomingAfter.length > 0) {
        active = upcomingAfter[0];
        seasonActive = true;
      } else {
        // Bütün maçlar oynanmış veya sadece ertelenmiş/kapanmış; sezon bitti
        seasonActive = false;
        // UX için active'i son oynanan haftaya sabitleyebiliriz
        active = lastPlayed;
      }
    } else {
      // Hiç finished yoksa, ilk upcoming haftayı active kabul et
      const upcomingAll = rounds.filter(
        (r) => roundMap.get(r).upcoming > 0
      );

      if (upcomingAll.length > 0) {
        active = upcomingAll[0];
        seasonActive = true;
      } else {
        // Ne finished ne upcoming var → saçma ama defensive case
        seasonActive = false;
        active = null;
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