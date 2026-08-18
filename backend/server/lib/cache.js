// Tiny TTL cache. On Render this is a long-lived process cache; on Vercel it is
// a per-instance warm cache, which is why every route also sets s-maxage so the
// CDN absorbs the bulk of repeat traffic.

const store = new Map();

// Collapses concurrent misses for the same key into one upstream request.
const inflight = new Map();

async function cached(key, ttlMs, producer) {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value;

  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    try {
      const value = await producer();
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    } catch (error) {
      // Serve stale data rather than an error when upstream blips.
      if (hit) return hit.value;
      throw error;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

module.exports = { cached };
