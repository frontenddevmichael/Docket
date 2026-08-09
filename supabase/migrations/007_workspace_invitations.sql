-- =============================================================
-- Docket — Migration 007: Workspace Invitations (invite + accept)
-- =============================================================

-- 1. Workspace invitations table
create table if not exists public.workspace_invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  email         text not null,
  role          text not null default 'member' check (role in ('admin', 'tester', 'member')),
  invited_by    uuid not null references auth.users(id),
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '7 days'
);

create index if not exists idx_workspace_invitations_email on public.workspace_invitations(email);
create index if not exists idx_workspace_invitations_workspace on public.workspace_invitations(workspace_id);

-- 2. RLS
alter table public.workspace_invitations enable row level security;

-- Admins/owners can view invites for their workspace
create policy "Admins can view workspace invitations"
  on public.workspace_invitations for select
  using (public.is_workspace_admin(workspace_invitations.workspace_id));

-- The invited user can view their own pending invites (matched by email)
create policy "Users can view own pending invitations"
  on public.workspace_invitations for select
  using (
    status = 'pending'
    and email = (select email from public.profiles where id = auth.uid())
  );

-- Admins/owners can create invites
create policy "Admins can create invitations"
  on public.workspace_invitations for insert
  with check (public.is_workspace_admin(workspace_invitations.workspace_id));

-- The invited user can accept/decline (update) their own pending invites
create policy "Users can accept or decline own invitations"
  on public.workspace_invitations for update
  using (
    status = 'pending'
    and email = (select email from public.profiles where id = auth.uid())
  );
