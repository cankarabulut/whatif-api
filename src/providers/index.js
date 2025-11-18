import { fdStandings, fdFixtures } from './footballData.js';

export function getProvider() {
  return { standings: fdStandings, fixtures: fdFixtures };
}
