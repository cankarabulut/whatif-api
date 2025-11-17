// src/providers/apiFootball.js
import axios from 'axios';

const API_BASE_URL = 'https://v3.football.api-sports.io';

export async function afStandings({ league, season }) {
  const url = `${API_BASE_URL}/standings`;

  const headers = {
    'x-apisports-key': process.env.AF_KEY || process.env.API_FOOTBALL_KEY,
    'Content-Type': 'application/json',
  };

  const params = {
    league,
    season,
  };

  const res = await axios.get(url, { params, headers });

  const data = res?.data?.response?.[0]?.league?.standings?.[0] || [];

  const table = data.map((row) => ({
    team: row.team.name,
    teamId: row.team.id,
    played: row.all.played,
    won: row.all.win,
    draw: row.all.draw,
    lost: row.all.lose,
    goalsFor: row.all.goals.for,
    goalsAgainst: row.all.goals.against,
    goalDiff: row.goalsDiff,
    points: row.points,
  }));

  return {
    league,
    season: String(season),
    table,
    provider: 'af',
  };
}

export async function afFixtures({ league, season }) {
  const url = `${API_BASE_URL}/fixtures`;

  const headers = {
    'x-apisports-key': process.env.AF_KEY || process.env.API_FOOTBALL_KEY,
    'Content-Type': 'application/json',
  };

  const params = {
    league,
    season,
  };

  const res = await axios.get(url, { params, headers });
  const fixtures = res?.data?.response || [];

  const matches = fixtures.map((fx) => ({
    id: fx.fixture.id,
    round: parseInt(fx.league.round?.split('_').pop()) || null, // örn: "Regular Season - 23"
    utcDate: fx.fixture.date,
    status: fx.fixture.status.short,
    homeTeam: {
      id: fx.teams.home.id,
      name: fx.teams.home.name,
    },
    awayTeam: {
      id: fx.teams.away.id,
      name: fx.teams.away.name,
    },
    score: {
      fullTime: {
        home: fx.goals.home,
        away: fx.goals.away,
      },
    },
  }));

  return {
    league,
    season: String(season),
    matches,
    provider: 'af',
  };
}