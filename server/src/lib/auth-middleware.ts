import { Request, Response, NextFunction } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAuth, createUserClient } from './supabase-admin.js'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      userJwt?: string
      supabase?: SupabaseClient
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized — missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token)

    if (error || !data.user) {
      res.status(401).json({ error: 'Unauthorized — invalid or expired token' })
      return
    }

    req.userId = data.user.id
    req.userJwt = token
    req.supabase = createUserClient(token)
    next()
  } catch (err) {
    // Never let an auth-service failure take down the whole process.
    console.error('[requireAuth] unexpected error:', err)
    res.status(500).json({ error: 'Authentication service unavailable' })
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.slice(7)
  try {
    const { data } = await supabaseAuth.auth.getUser(token)
    if (data.user) {
      req.userId = data.user.id
      req.userJwt = token
      req.supabase = createUserClient(token)
    }
  } catch (err) {
    console.error('[optionalAuth] unexpected error:', err)
  }
  next()
}
