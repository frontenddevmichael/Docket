import { Router } from 'express'
import type Stripe from 'stripe'
import { requireAuth } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import {
  getStripe,
  stripeConfigured,
  PLANS,
  getWorkspacePlan,
  countUsage,
} from '../lib/billing.js'

const router = Router()

const clientOrigin = (): string => process.env.CLIENT_ORIGIN ?? 'http://localhost:5175'

/** Public: tells the client whether checkout can actually run yet. */
router.get('/billing/config', (_req, res) => {
  res.json({
    configured: stripeConfigured(),
    proPriceConfigured: !!process.env.STRIPE_PRO_PRICE_ID,
    enterprisePriceConfigured: !!process.env.STRIPE_ENTERPRISE_PRICE_ID,
  })
})

/**
 * POST /api/billing/checkout — create a Stripe Checkout session for a plan.
 * Returns the session URL; the client redirects to it.
 */
router.post('/billing/checkout', requireAuth, async (req, res) => {
  try {
    const plan = req.body?.plan
    if (plan !== 'pro' && plan !== 'enterprise') {
      return res.status(400).json({ error: 'Invalid plan. Choose "pro" or "enterprise".' })
    }
    if (!stripeConfigured()) {
      return res.status(501).json({
        error: 'Billing is not configured yet. Contact the Docket team to enable payments.',
        code: 'billing_not_configured',
      })
    }
    const priceId =
      plan === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_ENTERPRISE_PRICE_ID
    if (!priceId) {
      return res.status(501).json({
        error: `No Stripe price is configured for the ${plan} plan yet.`,
        code: 'price_not_configured',
      })
    }

    const db = req.supabase!
    const { data: membership } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', req.userId!)
      .maybeSingle()
    if (!membership) {
      return res.status(400).json({ error: 'No workspace found for this account' })
    }
    const workspaceId = membership.workspace_id as string

    // Reuse the workspace's existing Stripe customer if there is one.
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    const origin = clientOrigin()
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: (existing?.stripe_customer_id as string | undefined) ?? undefined,
      metadata: { workspace_id: workspaceId, plan },
      client_reference_id: workspaceId,
      allow_promotion_codes: true,
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/upgrade?plan=${plan}&canceled=1`,
    })

    res.json({ url: session.url })
  } catch (err: any) {
    console.error('[billing] POST /checkout error:', err?.message ?? err)
    res.status(500).json({ error: 'Failed to start checkout. Please try again.' })
  }
})

/** POST /api/billing/portal — customer portal URL to manage/cancel the subscription. */
router.post('/billing/portal', requireAuth, async (req, res) => {
  try {
    if (!stripeConfigured()) {
      return res.status(501).json({
        error: 'Billing is not configured yet.',
        code: 'billing_not_configured',
      })
    }
    const db = req.supabase!
    const { data: membership } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', req.userId!)
      .maybeSingle()
    if (!membership) return res.status(400).json({ error: 'No workspace found' })

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', membership.workspace_id as string)
      .maybeSingle()
    if (!sub?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription to manage' })
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id as string,
      return_url: `${clientOrigin()}/settings`,
    })
    res.json({ url: session.url })
  } catch (err: any) {
    console.error('[billing] POST /portal error:', err?.message ?? err)
    res.status(500).json({ error: 'Failed to open billing portal. Please try again.' })
  }
})

/** GET /api/billing/plan — current plan + this month's generation usage. */
router.get('/billing/plan', requireAuth, async (req, res) => {
  try {
    const db = req.supabase!
    const { data: membership } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', req.userId!)
      .maybeSingle()
    if (!membership) return res.status(400).json({ error: 'No workspace found' })

    const workspaceId = membership.workspace_id as string
    const plan = await getWorkspacePlan(db, workspaceId)
    const limit = PLANS[plan].generationsPerMonth
    const now = new Date()
    const sinceIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const used = await countUsage(db, workspaceId, 'generation', sinceIso)

    res.json({
      plan,
      label: PLANS[plan].label,
      generationsPerMonth: limit,
      generationsUsed: used,
      stripeConfigured: stripeConfigured(),
    })
  } catch (err: any) {
    console.error('[billing] GET /plan error:', err?.message ?? err)
    res.status(500).json({ error: 'Failed to load plan' })
  }
})

/**
 * POST /api/billing/webhook — Stripe events.
 * Mounted with express.raw before the JSON parser (see index.ts) so the
 * signature can be verified against the exact bytes Stripe sent.
 */
router.post('/billing/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'] as string | undefined
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' })
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(501).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      req.body as Buffer,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err: any) {
    console.warn('[billing] webhook signature verification failed:', err?.message)
    return res.status(400).json({ error: 'Signature verification failed' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const workspaceId = session.metadata?.workspace_id
        if (!workspaceId) return res.status(400).json({ error: 'Missing workspace metadata' })
        const plan = session.metadata?.plan === 'enterprise' ? 'enterprise' : 'pro'
        // current_period_end is filled in by the next subscription.updated event.
        await supabaseAdmin.from('subscriptions').upsert(
          {
            workspace_id: workspaceId,
            stripe_customer_id: (session.customer as string) ?? null,
            stripe_subscription_id: (session.subscription as string) ?? null,
            plan,
            status: 'active',
            current_period_end: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id' },
        )
        console.log(`[billing] checkout completed workspace=${workspaceId.slice(0, 8)} plan=${plan}`)
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('workspace_id, plan')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle()
        if (!existing) break
        const active = sub.status === 'active' || sub.status === 'trialing'
        const periodEndSec = sub.items?.data?.[0]?.current_period_end
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: sub.status,
            plan: active ? existing.plan : 'free',
            current_period_end: periodEndSec
              ? new Date(periodEndSec * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('workspace_id', existing.workspace_id as string)
        console.log(
          `[billing] subscription ${sub.status} workspace=${(existing.workspace_id as string).slice(0, 8)}`,
        )
        break
      }
      default:
        break
    }
    res.json({ received: true })
  } catch (err: any) {
    console.error('[billing] webhook handling error:', err?.message ?? err)
    res.status(500).json({ error: 'Webhook handling failed' })
  }
})

export default router
