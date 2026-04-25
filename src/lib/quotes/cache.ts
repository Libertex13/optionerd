import "server-only";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

const NS = "optionerd:";
const memory = new Map<string, { expiresAt: number; value: unknown }>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const local = memory.get(key);
  if (local) {
    if (local.expiresAt > Date.now()) return local.value as T;
    memory.delete(key);
  }
  if (!redis) return null;
  try {
    const value = await redis.get<T>(NS + key);
    if (value !== null) memory.set(key, { value, expiresAt: Date.now() + 5_000 });
    return value;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  if (!redis) return;
  try {
    await redis.set(NS + key, value, { ex: ttlSeconds });
  } catch {
    // swallow — cache failure must not break the request
  }
}

export async function cacheDel(key: string): Promise<void> {
  memory.delete(key);
  if (!redis) return;
  try {
    await redis.del(NS + key);
  } catch {}
}
