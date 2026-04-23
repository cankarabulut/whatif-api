// src/providers/theSportsDb.js
import { env } from '../config/env.js';

const BASE = 'https://www.thesportsdb.com/api/v1/json';

/**
 * TheSportsDB için temel fetch helper
 * path örn: "eventsseason.php"
 * params örn: { id: 4328, s: "2014-2015" }
 */
async function tsdbFetch(path, params = {}) {
  const key = env.tsdbKey || '1'; // free/public key
  const url = new URL(`${BASE}/${key}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TSDB ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Standings (league table) - lookuptable.php
 * league: TheSportsDB league id (örnek: 4328)
 * season: "2014-2015" gibi string
 */
export async function tsdbStandings({ league, season }) {
  const params = { l: league };
  if (season) params.s = season;

  const data = await tsdbFetch('lookuptable.php', params);
  const table = data.table || [];

  return {
    league, // backend route tarafında tekrar internal league id ile override edeceğiz
    season: season || (table[0]?.strSeason ?? null),
    table: table.map((t) => ({
      rank: t.intRank != null ? Number(t.intRank) : null,
      team: t.strTeam,
      played: t.intPlayed != null ? Number(t.intPlayed) : null,
      won: t.intWin != null ? Number(t.intWin) : null,
      draw: t.intDraw != null ? Number(t.intDraw) : null,
      lost: t.intLoss != null ? Number(t.intLoss) : null,
      points: t.intPoints != null ? Number(t.intPoints) : null,
      goalsFor: t.intGoalsFor != null ? Number(t.intGoalsFor) : null,
      goalsAgainst: t.intGoalsAgainst != null ? Number(t.intGoalsAgainst) : null,
      goalDiff: t.intGoalDifference != null ? Number(t.intGoalDifference) : null,
    })),
    provider: 'tsdb',
  };
}

/**
 * Fixtures - eventsseason.php / eventsround.php
 * league: TheSportsDB league id (örnek: 4328)
 * season: "2014-2015"
 * round: (opsiyonel) numeric ya da string; varsa eventsround.php kullanılır
 */
export async function tsdbFixtures({ league, season, round }) {
  const params = { id: league };
  if (season) params.s = season;

  let data;

  if (round != null) {
    // Belirli bir round
    params.r = round;
    data = await tsdbFetch('eventsround.php', params);
  } else {
    // Tüm sezon
    data = await tsdbFetch('eventsseason.php', params);
  }

  const events = data.events || [];

  return {
    league, // route tarafında internal league ile override edilebilir
    season: season || (events[0]?.strSeason ?? null),
    round: round ?? null,
    matches: events.map((e) => ({
      id: e.idEvent,
      utcDate:
        e.strTimestamp ||
        (e.dateEvent
          ? `${e.dateEvent}T${e.strTime || '00:00:00'}`
          : null),
      status: e.strStatus || 'NS',
      home: e.strHomeTeam,
      away: e.strAwayTeam,
      // intRound genelde string geliyor, sayıya çevirelim
      round: e.intRound != null ? Number(e.intRound) : null,
      score: {
        fullTime: {
          home:
            e.intHomeScore != null ? Number(e.intHomeScore) : null,
          away:
            e.intAwayScore != null ? Number(e.intAwayScore) : null,
        },
        halfTime: null, // TSDB'de half-time score farklı alanlarda; şimdilik null bırakıyoruz
      },
    })),
    provider: 'tsdb',
  };
}
