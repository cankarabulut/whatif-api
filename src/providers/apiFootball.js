import { env } from '../config/env.js';

const BASE = 'https://v3.football.api-sports.io';

async function afFetch(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url, { headers: { 'x-apisports-key': env.afKey } });
  if (!r.ok) throw new Error(`AF ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function afStandings({ league, season }) {
  const data = await afFetch('/standings', { league, season });
  const leagueObj = data.response?.[0]?.league;
  const table = leagueObj?.standings?.[0] || [];
  return {
    league: String(leagueObj?.id || league),
    season: String(leagueObj?.season || season),
    table: table.map((t) => ({
      rank: t.rank,
      team: t.team.name,
      played: t.all.played,
      won: t.all.win,
      draw: t.all.draw,
      lost: t.all.lose,
      points: t.points,
      goalsFor: t.all.goals.for,
      goalsAgainst: t.all.goals.against,
      goalDiff: t.goalsDiff,
    })),
    provider: 'af',
  };
}

export async function afFixtures({ league, season, round }) {
  const params = { league, season };
  if (round) params.round = round; // e.g. "Regular Season - 12"
  const data = await afFetch('/fixtures', params);
  return {
    league: String(league),
    season: String(season),
    round: round || data.parameters?.round,
    matches: (data.response || []).map((m) => ({
      id: m.fixture.id,
      utcDate: m.fixture.date,
      status: m.fixture.status.short, // FT/NS/1H/2H/etc.
      home: m.teams.home.name,
      away: m.teams.away.name,
      round: m.league?.round, // e.g., 'Regular Season - 12'
      score: {
        fullTime: { home: m.goals.home, away: m.goals.away },
        halfTime: m.score.halftime,
      },
    })),
    provider: 'af',
  };
}
