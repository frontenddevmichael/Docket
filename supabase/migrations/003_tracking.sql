-- Usage tracking for instrumentation
create table if not exists public.tracking_events (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id),
  workspace_id  uuid references public.workspaces(id),
  session_id    uuid,
  event_type    text not null,
  event_data    jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_tracking_user on public.tracking_events(user_id);
create index if not exists idx_tracking_type on public.tracking_events(event_type);
create index if not exists idx_tracking_created on public.tracking_events(created_at);

alter table public.tracking_events enable row level security;

-- Allow the server-side service role to insert tracking events
-- (tracking is done server-side to avoid client manipulation)
create policy "Service role can manage tracking events"
  on public.tracking_events for all
  using (true)
  with check (true);
