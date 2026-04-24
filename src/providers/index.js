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

const PROVIDER_IDS = Object.keys(providers);

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

export function getProviderCandidates(preferred = 'fd') {
  if (!preferred || !providers[preferred]) return ['fd', 'tsdb'];
  return [preferred, ...PROVIDER_IDS.filter((id) => id !== preferred)];
}
