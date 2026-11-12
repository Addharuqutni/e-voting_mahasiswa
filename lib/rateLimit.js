// In-memory sliding window limiter.
//
// ponytail: state lives in the Node process, so it protects a single instance
// only. With more than one app instance (or behind several VPS), move this to
// Redis/Upstash so the counters are shared.
const buckets = new Map();
let calls = 0;

const sweep = () => {
  const now = Date.now();
  for (const [key, b] of buckets) if (b.reset <= now) buckets.delete(key);
};

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  // amortised cleanup keeps the map from growing without bound
  if (++calls % 200 === 0) sweep();

  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

export function resetLimit(key) {
  buckets.delete(key);
}
