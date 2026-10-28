-- READ ONLY: catalog metadata only; no application row values are returned.
-- Run in SQL Editor as postgres, or through an authorized read-only MCP client.
-- Expected after the vault migration: 43 rows, all status OK.
-- REVIEW_NEW_TABLE means its access requirements must be reviewed explicitly.
with legacy (table_name) as (
  values
    ('asset_gold'), ('asset_gold_transfers'), ('asset_people'), ('assets'),
    ('checks'), ('contact_emails'), ('contact_tels'), ('contacts'),
    ('darfak_expenses'), ('installment_payments'), ('installment_plans'),
    ('kv_store'), ('ledger_entries'), ('monthly_funds'), ('password_entries'),
    ('people'), ('projects'), ('settings'), ('social_insurance'),
    ('state_accountant'), ('state_auth'), ('state_daily_tasks'), ('state_darfak'),
    ('state_password_manager'), ('state_phone_book'), ('state_settings'),
    ('subtasks'), ('task_tags'), ('tasks'), ('transactions'), ('vehicle_expenses'),
    ('vehicle_insurances'), ('vehicle_maintenances'), ('vehicles')
), vault_expected(table_name, authenticated_privileges) as (
  values
    ('user_vaults', array['SELECT']),
    ('crm_customers', array['SELECT','INSERT','UPDATE']),
    ('crm_projects', array['SELECT','INSERT','UPDATE']),
    ('crm_records', array['SELECT','INSERT','UPDATE']),
    ('crm_record_projects', array['SELECT','INSERT','UPDATE','DELETE']),
    ('crm_ledger_entries', array['SELECT','INSERT','UPDATE']),
    ('crm_notes', array['SELECT','INSERT','UPDATE']),
    ('vault_attachments', array['SELECT','INSERT','UPDATE']),
    ('vault_revisions', array['SELECT'])
), expected as (
  select table_name,array['SELECT','INSERT','UPDATE','DELETE'] as authenticated_privileges,false as vault_table from legacy
  union all select table_name,authenticated_privileges,true from vault_expected
), inventory as (
  select c.oid, c.relname::text as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
), targets as (
  select coalesce(e.table_name, i.table_name) as table_name,
    e.table_name is not null as expected_by_app, i.oid, i.rls_enabled,e.authenticated_privileges,e.vault_table
  from expected e
  full join inventory i using (table_name)
), checks as (
  select t.*,
    (select count(*) from pg_policy p where p.polrelid = t.oid) as policy_count,
    array(
      select role_name || ':' || privilege_name
      from unnest(array['authenticated', 'service_role']) as role_name
      cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as privilege_name
      where (role_name='service_role' or privilege_name=any(t.authenticated_privileges))
        and (t.oid is null or not has_table_privilege(role_name, t.oid, privilege_name))
      order by role_name, privilege_name
    ) as missing_table_grants,
    array(
      select 'authenticated:' || operation || ':' || column_name
      from (values
        ('INSERT','user_id'),('INSERT','key_id'),('INSERT','salt'),('INSERT','iterations'),
        ('INSERT','password_wrap'),('INSERT','recovery_wrap'),('INSERT','revision'),
        ('UPDATE','salt'),('UPDATE','iterations'),('UPDATE','password_wrap'),('UPDATE','recovery_wrap'),('UPDATE','revision')
      ) as required(operation,column_name)
      where t.table_name='user_vaults' and (t.oid is null or not has_column_privilege('authenticated',t.oid,column_name,operation))
    ) as missing_column_grants,
    array(
      select role_name || ':' || privilege_name
      from unnest(array['anon','authenticated']) role_name
      cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) privilege_name
      where t.vault_table and t.oid is not null
        and (role_name='anon' or not privilege_name=any(t.authenticated_privileges))
        and has_table_privilege(role_name,t.oid,privilege_name)
    ) as excessive_table_grants,
    array(
      select role_name
      from unnest(array['authenticated', 'service_role']) as role_name
      where not has_schema_privilege(role_name, 'public', 'USAGE')
      order by role_name
    ) as missing_schema_usage,
    array(
      select format('%I.%I:%s', n.nspname, s.relname, role_name)
      from pg_class s
      join pg_namespace n on n.oid = s.relnamespace
      join pg_depend d on d.classid = 'pg_class'::regclass and d.objid = s.oid
        and d.refclassid = 'pg_class'::regclass and d.refobjid = t.oid
        and d.deptype in ('a', 'i')
      cross join unnest(array['authenticated', 'service_role']) as role_name
      where s.relkind = 'S' and not has_sequence_privilege(role_name, s.oid, 'USAGE')
      order by n.nspname, s.relname, role_name
    ) as missing_sequence_usage
  from targets t
)
select table_name, expected_by_app, oid is not null as table_exists,
  rls_enabled, policy_count, missing_table_grants,missing_column_grants,excessive_table_grants,
  missing_schema_usage, missing_sequence_usage,
  case
    when oid is null then 'MISSING_TABLE'
    when not expected_by_app then 'REVIEW_NEW_TABLE'
    when not rls_enabled then 'RLS_DISABLED'
    when policy_count = 0 then 'NO_POLICIES'
    when cardinality(excessive_table_grants)>0 then 'EXCESSIVE_GRANTS'
    when cardinality(missing_table_grants) > 0
      or cardinality(missing_column_grants)>0
      or cardinality(missing_schema_usage) > 0
      or cardinality(missing_sequence_usage) > 0 then 'MISSING_GRANTS'
    else 'OK'
  end as status
from checks
order by table_name;
