import { fdStandings, fdFixtures } from './footballData.js';
import { tsdbStandings, tsdbFixtures } from './theSportsDb.js';

// providerId -> implemantasyon
const providers = {
  fd: {
    standings: fdStandings,
    fixtures: fdFixtures,
  },
  tsdb: {
    standings: tsdbStandings,
    fixtures: tsdbFixtures,
  },
};

/**
 * @param {string} providerId - örn: "fd", "tsdb"
 */
export function getProvider(providerId = 'fd') {
  const p = providers[providerId];
  if (!p) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return p;
}
