import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';
import { env } from '../config/env.js';

const lru = new LRUCache({ max: 500, ttl: env.cacheTTL * 1000 });
let redis = null;
if (env.redisUrl) {
  redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
}

export async function getCache(key) {
  if (redis) {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  }
  return lru.get(key) || null;
}

export async function setCache(key, value, ttlSec = env.cacheTTL) {
  if (redis) {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSec);
  } else {
    lru.set(key, value, { ttl: ttlSec * 1000 });
  }
}
