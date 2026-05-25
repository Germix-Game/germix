import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let authRatelimit: Ratelimit | null = null

function getIpAddress(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  return (
    request.headers.get('x-real-ip')?.trim() ??
    request.headers.get('cf-connecting-ip')?.trim() ??
    'unknown'
  )
}

function getAuthRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  if (!authRatelimit) {
    authRatelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'germix:auth',
    })
  }

  return authRatelimit
}

export async function checkAuthRateLimit(request: Request) {
  const limiter = getAuthRatelimit()
  if (!limiter) {
    return { success: true as const }
  }

  const identifier = `ip:${getIpAddress(request)}`
  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  }
}