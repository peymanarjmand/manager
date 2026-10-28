-- TEMPLATE ONLY. Rename example_user_items and adapt its columns before use.
-- Put this complete unit in a new migration; do not run it on production as a test.
begin;

create table public.example_user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  value jsonb not null,
  created_at timestamptz not null default now()
);

create index example_user_items_user_id_idx
  on public.example_user_items (user_id);

alter table public.example_user_items enable row level security;

create policy example_user_items_owner
  on public.example_user_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Normalize privileges on THIS NEW table, including on older projects where
-- Supabase still supplies broad default privileges. Never run this against an
-- existing application table without reviewing its access requirements.
revoke all on table public.example_user_items
  from public, anon, authenticated, service_role;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete
  on table public.example_user_items
  to authenticated, service_role;

-- UUID identifiers need no sequence grant. For a serial-backed table, grant
-- USAGE on its specific sequence to the roles that actually insert rows.

commit;
