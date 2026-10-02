/**
 * RATE LIMITER - Upstash Redis
 * ============================
 * Prevents spam attacks on public endpoints (report submission)
 * 
 * VULNERABILITY FIXED: DoS attack via 10,000 report spam
 * 
 * Setup:
 * 1. Create free account at https://upstash.com
 * 2. Create a Redis database
 * 3. Copy REST URL and Token to .env.local:
 *    UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=your-token
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client (uses env vars automatically)
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Rate Limiter for Anonymous Report Submissions
 * 
 * Algorithm: Sliding Window
 * Limit: 5 requests per 1 minute per IP
 * 
 * This prevents:
 * - Spam attacks flooding the database
 * - Automated bot submissions
 * - Resource exhaustion attacks
 */
export const reportSubmitLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    analytics: true,
    prefix: 'vissel:submit',
})

/**
 * Rate Limiter for Public Tenant Lookup
 * 
 * Limit: 30 requests per 1 minute per IP
 * More lenient since tenant lookup is needed for initial page load
 */
export const tenantLookupLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'vissel:tenant',
})

/**
 * Rate Limiter for Dashboard Actions
 * 
 * Limit: 100 requests per 1 minute per user
 * Used for authenticated actions (changing status, viewing reports)
 */
export const dashboardLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'vissel:dashboard',
})

/**
 * Check rate limit for a given identifier
 * Returns { success: boolean, remaining: number, reset: Date }
 */
export async function checkRateLimit(
    limiter: Ratelimit,
    identifier: string
): Promise<{
    success: boolean
    remaining: number
    resetAt: Date
    error?: string
}> {
    try {
        const result = await limiter.limit(identifier)

        return {
            success: result.success,
            remaining: result.remaining,
            resetAt: new Date(result.reset),
            error: result.success ? undefined : 'Rate limit exceeded. Please try again later.',
        }
    } catch (error) {
        // If Redis is down, fail open (allow request) but log
        console.error('Rate limiter error:', error)
        return {
            success: true,
            remaining: -1,
            resetAt: new Date(),
        }
    }
}

/**
 * Identiteten för rate limiting hämtas ur `getRateLimitIdentifier()`
 * (src/lib/security/anonymize.ts) - den läser den saltade IP-hash som
 * middleware lägger till. Den råa IP-adressen finns inte längre tillgänglig
 * här, och ska inte heller finnas i Redis-nycklarna.
 */
