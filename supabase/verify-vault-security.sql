-- READ ONLY. Never queries decrypted user values or keys.
select 'rls_tables' as check_name,
  count(*)=9 and bool_and(c.relrowsecurity) as passed,
  count(*)::text as detail
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('user_vaults','crm_customers','crm_projects','crm_records','crm_record_projects','crm_ledger_entries','crm_notes','vault_attachments','vault_revisions')
union all
select 'public_rpc_invoker_only',count(*)=3 and bool_and(not p.prosecdef),'3 expected'
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('vault_save_record','vault_finish_password_migration','vault_restore_revision')
union all
select 'rpc_auth_only',count(*)=3 and bool_and(has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')),'no anonymous execution'
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('vault_save_record','vault_finish_password_migration','vault_restore_revision')
union all
select 'protected_migration_marker',not has_column_privilege('authenticated','public.user_vaults','legacy_migrated','UPDATE')
  and not has_column_privilege('authenticated','public.user_vaults','legacy_migrated','INSERT'),'RPC only'
union all
select 'private_image_bucket',coalesce(bool_and(not public and allowed_mime_types=array['application/octet-stream']::text[]),false),'encrypted binary only'
from storage.buckets where id='lm-vault'
union all
select 'storage_owner_boundaries',count(*)=6,'4 owner policies + 2 restrictive boundaries'
from pg_policies where schemaname='storage' and tablename='objects' and policyname in
  ('vault_files_select','vault_files_insert','vault_files_update','vault_files_delete','vault_files_owner_boundary','vault_files_no_anon')
union all
select 'relationship_indexes',count(*)=2,'both owner/customer foreign keys covered'
from pg_indexes where schemaname='public' and tablename='crm_record_projects'
  and indexname in ('crm_record_projects_record_owner_fk_idx','crm_record_projects_project_owner_fk_idx');
