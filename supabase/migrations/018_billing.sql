-- 018_billing.sql — Stripe billing + plan usage tracking.
-- The server (service role) writes both tables; members can read their
-- workspace's subscription/usage for display in Settings.

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null unique references public.workspaces(id) on delete cascade,
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  plan                  text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  status                text not null default 'active',
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.usage_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind         text not null default 'generation',
  created_at   timestamptz not null default now()
);

create index if not exists usage_events_workspace_kind_idx
  on public.usage_events (workspace_id, kind, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;

create policy "Members can view their workspace subscription"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = subscriptions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Members can view their workspace usage"
  on public.usage_events for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = usage_events.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

grant select on public.subscriptions to authenticated;
grant select on public.usage_events to authenticated;
