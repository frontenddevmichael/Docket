import rateLimit from 'express-rate-limit'

// Per-user rate limiting for the generation endpoint.
// Limits: 10 generations per hour per user.
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use the authenticated user ID from the auth middleware, fall back to IP
    return (req as any).userId ?? req.ip ?? 'unknown'
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Generation limit reached. You can generate up to 10 sets of test cases per hour. Please try again later.',
    })
  },
})
