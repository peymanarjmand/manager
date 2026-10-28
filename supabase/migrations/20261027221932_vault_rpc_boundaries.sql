-- Keep privileged implementations out of the exposed API schema. The public
-- API keeps the same signatures and delegates through SECURITY INVOKER wrappers.
-- Ownership checks and protected migration/history writes remain unchanged.
begin;
set local lock_timeout='5s';
alter function public.vault_finish_password_migration(bigint,jsonb,text) set schema private;
alter function public.vault_restore_revision(jsonb) set schema private;
revoke all on function private.vault_finish_password_migration(bigint,jsonb,text) from public,anon;
revoke all on function private.vault_restore_revision(jsonb) from public,anon;
grant execute on function private.vault_finish_password_migration(bigint,jsonb,text) to authenticated;
grant execute on function private.vault_restore_revision(jsonb) to authenticated;
create function public.vault_finish_password_migration(p_revision bigint,p_payload jsonb,p_backup_sha256 text)
returns void language sql security invoker set search_path='' as $$
  select private.vault_finish_password_migration(p_revision,p_payload,p_backup_sha256)
$$;
create function public.vault_restore_revision(p_row jsonb)
returns void language sql security invoker set search_path='' as $$
  select private.vault_restore_revision(p_row)
$$;
revoke all on function public.vault_finish_password_migration(bigint,jsonb,text) from public,anon;
revoke all on function public.vault_restore_revision(jsonb) from public,anon;
grant execute on function public.vault_finish_password_migration(bigint,jsonb,text) to authenticated;
grant execute on function public.vault_restore_revision(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
