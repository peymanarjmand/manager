-- REPLAY HELPER, NOT A SCHEMA BASELINE OR A PRODUCTION MIGRATION.
-- Production was audited on 2026-10-27: these privileges already exist.
-- Only use after restoring the reviewed schema AND its ownership RLS policies
-- into a new/isolated environment. This script never creates or rewrites data.
-- New tables should instead get grants in their own creation migration.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $grants$
declare
  table_name text;
  table_oid oid;
  rls_enabled boolean;
begin
  if not has_schema_privilege('authenticated', 'public', 'USAGE')
    or not has_schema_privilege('service_role', 'public', 'USAGE') then
    raise exception 'Missing schema USAGE: review schema setup before replaying grants';
  end if;

  foreach table_name in array array[
    'asset_gold', 'asset_gold_transfers', 'asset_people', 'assets',
    'checks', 'contact_emails', 'contact_tels', 'contacts',
    'darfak_expenses', 'installment_payments', 'installment_plans',
    'kv_store', 'ledger_entries', 'monthly_funds', 'password_entries',
    'people', 'projects', 'settings', 'social_insurance',
    'state_accountant', 'state_auth', 'state_daily_tasks', 'state_darfak',
    'state_password_manager', 'state_phone_book', 'state_settings',
    'subtasks', 'task_tags', 'tasks', 'transactions', 'vehicle_expenses',
    'vehicle_insurances', 'vehicle_maintenances', 'vehicles'
  ] loop
    select c.oid, c.relrowsecurity into table_oid, rls_enabled
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = table_name and c.relkind in ('r', 'p');

    if table_oid is null then
      raise exception 'Required table public.% is missing; no grants will be committed', table_name;
    end if;
    if not rls_enabled or not exists (
      select 1 from pg_policy p where p.polrelid = table_oid
    ) then
      raise exception 'Review ownership RLS on public.% before granting access', table_name;
    end if;

    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated, service_role',
      table_name
    );
  end loop;
end;
$grants$;

-- Vault tables deliberately have fewer privileges than the legacy modules.
do $vault_grants$
declare t text; target oid;
begin
  foreach t in array array['user_vaults','crm_customers','crm_projects','crm_records','crm_record_projects','crm_ledger_entries','crm_notes','vault_attachments','vault_revisions'] loop
    target:=to_regclass(format('public.%I',t));
    if target is null or not (select relrowsecurity from pg_class where oid=target)
      or not exists(select 1 from pg_policy where polrelid=target) then
      raise exception 'Review vault schema and ownership RLS before replaying public.%',t;
    end if;
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
    if t not in ('user_vaults','vault_revisions') then
      execute format('grant insert,update on public.%I to authenticated',t);
    end if;
  end loop;
end $vault_grants$;
grant insert (user_id,key_id,salt,iterations,password_wrap,recovery_wrap,revision) on public.user_vaults to authenticated;
grant update (salt,iterations,password_wrap,recovery_wrap,revision) on public.user_vaults to authenticated;
grant delete on public.crm_record_projects to authenticated;

-- Reviewed vault RPC grants are in their creation migration. Do not grant
-- generic function execution when replaying schema.
-- Do not add blanket grants or anonymous access here.
commit;
