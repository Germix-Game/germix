type Entry = { count: number; reset: number }

const store = new Map<string, Entry>()

/**
 * Returns true if the request is within the allowed window, false if rate-limited.
 * State is in-process memory — resets on server restart and is per-worker in
 * multi-worker deployments, which is acceptable for a small internal deployment.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}
