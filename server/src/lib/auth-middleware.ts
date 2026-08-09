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
    console.log(`[requireAuth] 401 — missing/invalid Authorization header (${req.path})`)
    res.status(401).json({ error: 'Unauthorized — missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice(7)
  console.log(`[requireAuth] verifying token (${token.slice(0, 20)}...) for ${req.path}`)
  const result = await supabaseAuth.auth.getUser(token).catch((e) => {
    console.log(`[requireAuth] THREW: ${e?.message ?? e}`)
    return { data: { user: null }, error: e }
  })
  const { data, error } = result

  if (error || !data.user) {
    console.log(`[requireAuth] 401 — error=${error?.message ?? 'none'}, code=${error?.code ?? 'none'}, status=${error?.status ?? 'none'}, user=${!!data.user}`)
    res.status(401).json({ error: 'Unauthorized — invalid or expired token' })
    return
  }

  console.log(`[requireAuth] OK — userId=${data.user.id}`)

  req.userId = data.user.id
  req.userJwt = token
  req.supabase = createUserClient(token)
  next()
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.slice(7)
  const { data } = await supabaseAuth.auth.getUser(token)
  if (data.user) {
    req.userId = data.user.id
    req.userJwt = token
    req.supabase = createUserClient(token)
  }
  next()
}
