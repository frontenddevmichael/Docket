import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Plan definitions. `generationsPerMonth: null` means unlimited.
 * Keep in sync with the pricing cards on the marketing page.
 */
export const PLANS = {
  free: { label: 'Free', generationsPerMonth: 25 },
  pro: { label: 'Pro', generationsPerMonth: null },
  enterprise: { label: 'Enterprise', generationsPerMonth: null },
} as const

export type PlanId = keyof typeof PLANS

let stripe: Stripe | undefined

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

export function getStripe(): Stripe {
  if (!stripeConfigured()) throw new Error('Stripe is not configured')
  if (!stripe) {
    // Use the SDK's default API version — pinned by the installed SDK.
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
  }
  return stripe
}

/** Resolve a workspace's plan, defaulting to free. */
export async function getWorkspacePlan(
  db: SupabaseClient,
  workspaceId: string,
): Promise<PlanId> {
  try {
    const { data } = await db
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (data?.plan === 'pro' || data?.plan === 'enterprise') return data.plan
  } catch (err) {
    console.warn('[billing] getWorkspacePlan failed, assuming free:', err)
  }
  return 'free'
}

const startOfMonth = (): string => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function countUsage(
  db: SupabaseClient,
  workspaceId: string,
  kind: string,
  sinceIso: string,
): Promise<number> {
  const { count } = await db
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('kind', kind)
    .gte('created_at', sinceIso)
  return count ?? 0
}

export async function recordUsage(
  db: SupabaseClient,
  workspaceId: string,
  kind: string,
): Promise<void> {
  await db.from('usage_events').insert({ workspace_id: workspaceId, kind })
}

export type GenerationAllowance =
  | { ok: true }
  | { ok: false; limit: number; used: number }

/**
 * Check whether a workspace may run another generation this month.
 * Fail-open on infrastructure errors so a billing hiccup never blocks
 * the product — only the limit itself gates generation.
 */
export async function assertGenerationAllowed(
  db: SupabaseClient,
  workspaceId: string,
): Promise<GenerationAllowance> {
  try {
    const plan = await getWorkspacePlan(db, workspaceId)
    const limit = PLANS[plan].generationsPerMonth
    if (limit === null) return { ok: true }
    const used = await countUsage(db, workspaceId, 'generation', startOfMonth())
    if (used >= limit) return { ok: false, limit, used }
  } catch (err) {
    console.warn('[billing] assertGenerationAllowed failed, allowing:', err)
  }
  return { ok: true }
}
