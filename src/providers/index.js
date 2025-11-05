import { fdStandings, fdFixtures } from './footballData.js';
import { afStandings, afFixtures } from './apiFootball.js';

export function getProvider(provider) {
  if (provider === 'af') {
    return { standings: afStandings, fixtures: afFixtures };
  }
  return { standings: fdStandings, fixtures: fdFixtures };
}
