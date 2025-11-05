import { env } from '../config/env.js';

const BASE = 'https://api.football-data.org/v4';

async function fdFetch(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url, { headers: { 'X-Auth-Token': env.fdKey } });
  if (!r.ok) throw new Error(`FD ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function fdStandings({ league, season }) {
  const data = await fdFetch(`/competitions/${league}/standings`, season ? { season } : {});
  return {
    league,
    season: season || data.season?.startDate?.slice(0,4),
    table: data.standings?.[0]?.table?.map((t) => ({
      rank: t.position,
      team: t.team.name,
      played: t.playedGames,
      won: t.won,
      draw: t.draw,
      lost: t.lost,
      points: t.points,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      goalDiff: t.goalDifference,
    })) || [],
    provider: 'fd',
  };
}

export async function fdFixtures({ league, season, round }) {
  const params = {};
  if (season) params.season = season;
  if (round) params.matchday = round;
  const data = await fdFetch(`/competitions/${league}/matches`, params);
  return {
    league,
    season: season || data.filters?.season,
    round: round || data.filters?.matchday,
    matches: (data.matches || []).map((m) => ({
      id: m.id,
      utcDate: m.utcDate,
      status: m.status,
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      round: m.matchday, // added for rounds computation
      score: {
        fullTime: m.score.fullTime,
        halfTime: m.score.halfTime,
      },
    })),
    provider: 'fd',
  };
}
