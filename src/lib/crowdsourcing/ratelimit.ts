/**
 * Simple in-memory rate limiter for crowdsource submissions
 * For production, use Redis-based solution
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

/**
 * Check if request is allowed under rate limit
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 3600000, maxRequests: 10 } // Default: 10 per hour
): RateLimitResult {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  
  let entry = store.get(key);
  
  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs
    };
  }
  
  // Check if over limit
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now
    };
  }
  
  // Increment and save
  entry.count++;
  store.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt
  };
}

/**
 * Get rate limit key from request
 */
export function getRateLimitKey(request: Request, projectId: string): string {
  // Use IP + project as key
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return `${ip}:${projectId}`;
}

/**
 * Default rate limit configs
 */
export const RATE_LIMITS = {
  submission: { windowMs: 3600000, maxRequests: 10 },  // 10 per hour
  validation: { windowMs: 60000, maxRequests: 30 },    // 30 per minute
  export: { windowMs: 60000, maxRequests: 5 }          // 5 per minute
};
