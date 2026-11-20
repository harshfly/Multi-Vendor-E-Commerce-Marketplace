import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

class InMemoryRedisFallback {
  private store = new Map<string, string>();
  private hashes = new Map<string, Map<string, string>>();
  private ttls = new Map<string, NodeJS.Timeout>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      if (this.ttls.has(key)) clearTimeout(this.ttls.get(key)!);
      this.ttls.set(
        key,
        setTimeout(() => {
          this.store.delete(key);
          this.hashes.delete(key);
        }, duration * 1000)
      );
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key) || this.hashes.has(key);
    this.store.delete(key);
    this.hashes.delete(key);
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key)!);
      this.ttls.delete(key);
    }
    return existed ? 1 : 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashes.get(key);
    return hash?.get(field) ?? null;
  }

  async hset(key: string, fieldOrObj: string | Record<string, string | number>, val?: string | number): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;
    if (typeof fieldOrObj === 'object') {
      for (const [f, v] of Object.entries(fieldOrObj)) {
        hash.set(f, String(v));
      }
      return Object.keys(fieldOrObj).length;
    } else {
      hash.set(fieldOrObj, String(val));
      return 1;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    const res: Record<string, string> = {};
    for (const [k, v] of hash.entries()) {
      res[k] = v;
    }
    return res;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let count = 0;
    for (const f of fields) {
      if (hash.delete(f)) count++;
    }
    return count;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key) && !this.hashes.has(key)) return 0;
    if (this.ttls.has(key)) clearTimeout(this.ttls.get(key)!);
    this.ttls.set(
      key,
      setTimeout(() => {
        this.store.delete(key);
        this.hashes.delete(key);
      }, seconds * 1000)
    );
    return 1;
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }
}

let redisClient: Redis | null = null;
let useFallback = false;
const fallbackStore = new InMemoryRedisFallback();

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        useFallback = true;
        return null;
      }
      return Math.min(times * 100, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on('error', (err) => {
    logger.warn({ err: err.message }, 'Redis connection error - switching to in-memory fallback');
    useFallback = true;
  });

  redisClient.connect().catch(() => {
    logger.info('Using memory store for cart/sessions/cache (Redis not reachable)');
    useFallback = true;
  });
} catch (err) {
  useFallback = true;
}

export const redis = new Proxy({} as any, {
  get(_target, prop) {
    if (!useFallback && redisClient && redisClient.status === 'ready') {
      return (redisClient as any)[prop]?.bind(redisClient);
    }
    return (fallbackStore as any)[prop]?.bind(fallbackStore);
  },
});

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const res = await redis.ping();
    return res === 'PONG';
  } catch {
    return false;
  }
};

