// middleware/idempotencyMiddleware.js
// Safe: doesn't crash if 'redis' npm package is not installed or Redis not reachable.

let client = null;
try {
  const redis = require('redis');
  client = redis.createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
  client.connect().catch(() => { /* ignore connection errors */ });
} catch (e) {
  // redis package not installed or cannot require it — fall back to no-op cache
  client = null;
}

async function getCachedResponse(key) {
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function setCachedResponse(key, value, ttlSec = 60 * 60 * 24) {
  if (!client) return;
  try {
    await client.setEx(key, ttlSec, JSON.stringify(value));
  } catch (e) { /* ignore */ }
}

module.exports = (req, res, next) => {
  const idKey = req.header('idempotency-key');
  if (!idKey) return next();

  const cacheKey = `idem:${idKey}`;

  (async () => {
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return res.status(cached.status || 200).json(cached.body);
    }

    const origJson = res.json.bind(res);
    res.json = async (body) => {
      try {
        await setCachedResponse(cacheKey, { status: res.statusCode || 200, body }, 60 * 60 * 24);
      } catch (e) { /* ignore */ }
      return origJson(body);
    };

    next();
  })().catch(next);
};