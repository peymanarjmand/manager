-- Additive vault/CRM schema. Existing application rows are never rewritten here.
begin;
set local lock_timeout = '5s';
create schema if not exists private;
revoke all on schema private from public;

create function private.vault_envelope_valid(value jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'object' and value->>'v' = '1'
    and length(value->>'keyId') = 36 and length(value->>'iv') = 16
    and length(value->>'ct') >= 24 and value - array['v','keyId','iv','ct'] = '{}'::jsonb, false)
$$;
-- CHECK constraints run with the caller's permissions.
grant usage on schema private to authenticated, service_role;
revoke all on function private.vault_envelope_valid(jsonb) from public;
grant execute on function private.vault_envelope_valid(jsonb) to authenticated, service_role;

create table public.user_vaults (
  user_id uuid primary key default auth.uid() references auth.users(id),
  key_id uuid not null unique,
  salt text not null check (length(salt) = 24),
  iterations integer not null check (iterations = 600000),
  password_wrap jsonb not null check (private.vault_envelope_valid(password_wrap)),
  recovery_wrap jsonb not null check (private.vault_envelope_valid(recovery_wrap)),
  revision bigint not null default 1 check (revision > 0),
  legacy_migrated boolean not null default false,
  migration_backup_sha256 text,
  created_at timestamptz not null default now(),
  check (password_wrap->>'keyId' = key_id::text and recovery_wrap->>'keyId' = key_id::text)
);
alter table public.user_vaults enable row level security;
create policy vault_owner on public.user_vaults for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_vaults from public, anon, authenticated;
grant select on public.user_vaults to authenticated;
grant insert (user_id,key_id,salt,iterations,password_wrap,recovery_wrap,revision) on public.user_vaults to authenticated;
grant update (salt, iterations, password_wrap, recovery_wrap, revision) on public.user_vaults to authenticated;
grant select, insert, update, delete on public.user_vaults to service_role;

create table public.crm_customers (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id),
  payload jsonb not null check (private.vault_envelope_valid(payload)),
  revision bigint not null default 1 check (revision > 0), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, id)
);
create table public.crm_projects (
  id uuid primary key, user_id uuid not null default auth.uid(), customer_id uuid not null,
  payload jsonb not null check (private.vault_envelope_valid(payload)),
  revision bigint not null default 1 check (revision > 0), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, id), unique (user_id, customer_id, id),
  foreign key (user_id, customer_id) references public.crm_customers(user_id, id)
);
create table public.crm_records (
  id uuid primary key, user_id uuid not null default auth.uid(), customer_id uuid not null,
  payload jsonb not null check (private.vault_envelope_valid(payload)),
  revision bigint not null default 1 check (revision > 0), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, id), unique (user_id, customer_id, id),
  foreign key (user_id, customer_id) references public.crm_customers(user_id, id)
);
create table public.crm_record_projects (
  user_id uuid not null default auth.uid(), customer_id uuid not null, record_id uuid not null, project_id uuid not null,
  primary key (user_id, record_id, project_id),
  foreign key (user_id, customer_id, record_id) references public.crm_records(user_id, customer_id, id),
  foreign key (user_id, customer_id, project_id) references public.crm_projects(user_id, customer_id, id)
);
create table public.crm_ledger_entries (
  id uuid primary key, user_id uuid not null default auth.uid(), customer_id uuid not null, project_id uuid,
  payload jsonb not null check (private.vault_envelope_valid(payload)),
  revision bigint not null default 1 check (revision > 0), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, id), foreign key (user_id, customer_id) references public.crm_customers(user_id, id),
  foreign key (user_id, customer_id, project_id) references public.crm_projects(user_id, customer_id, id)
);
create table public.crm_notes (
  id uuid primary key, user_id uuid not null default auth.uid(), customer_id uuid not null,
  payload jsonb not null check (private.vault_envelope_valid(payload)),
  revision bigint not null default 1 check (revision > 0), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, id), foreign key (user_id, customer_id) references public.crm_customers(user_id, id)
);
create table public.vault_attachments (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users(id),
  parent_kind text not null check (parent_kind in ('customer','project','record','ledger','note','password')),
  parent_id text not null, customer_id uuid,
  object_path text not null unique, payload jsonb not null check (private.vault_envelope_valid(payload)),
  revision bigint not null default 1 check (revision > 0), archived_at timestamptz,
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (object_path = user_id::text || '/' || id::text || '.bin'),
  foreign key (user_id, customer_id) references public.crm_customers(user_id, id)
);
create table public.vault_revisions (
  user_id uuid not null references auth.users(id), entity_table text not null, entity_id text not null,
  revision bigint not null, payload jsonb not null check (private.vault_envelope_valid(payload)),
  archived_at timestamptz, recorded_at timestamptz not null default now(),
  primary key (user_id, entity_table, entity_id, revision)
);
alter table public.vault_revisions enable row level security;
create policy revisions_owner on public.vault_revisions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.vault_revisions from public, anon, authenticated;
grant select on public.vault_revisions to authenticated;
grant select, insert, update, delete on public.vault_revisions to service_role;

do $setup$
declare t text;
begin
  foreach t in array array['crm_customers','crm_projects','crm_records','crm_record_projects','crm_ledger_entries','crm_notes','vault_attachments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
    if t <> 'crm_record_projects' then
      execute format('create index %I on public.%I (user_id, id)', t || '_owner_idx', t);
    end if;
  end loop;
end;
$setup$;
grant delete on public.crm_record_projects to authenticated;
create index crm_projects_customer_idx on public.crm_projects(user_id, customer_id);
create index crm_records_customer_idx on public.crm_records(user_id, customer_id);
create index crm_links_project_idx on public.crm_record_projects(user_id, project_id);
create index crm_ledger_customer_idx on public.crm_ledger_entries(user_id, customer_id);
create index crm_ledger_project_idx on public.crm_ledger_entries(user_id, customer_id, project_id);
create index crm_notes_customer_idx on public.crm_notes(user_id, customer_id);
create index vault_attachments_parent_idx on public.vault_attachments(user_id, parent_kind, parent_id);
create index vault_attachments_customer_idx on public.vault_attachments(user_id, customer_id);

-- A narrowly scoped trigger writes encrypted history; API clients cannot rewrite history.
create function private.vault_key_boundary() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_key uuid;
begin
  select key_id into owner_key from public.user_vaults where user_id=new.user_id;
  if owner_key is null or new.payload->>'keyId'<>owner_key::text then raise exception 'Invalid vault key'; end if;
  return new;
end $$;
revoke all on function private.vault_key_boundary() from public,anon,authenticated;
create function private.vault_revision() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.id <> old.id then raise exception 'Immutable identity'; end if;
  insert into public.vault_revisions(user_id,entity_table,entity_id,revision,payload,archived_at)
    values (old.user_id,tg_table_name,old.id::text,old.revision,old.payload,old.archived_at);
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end $$;
revoke all on function private.vault_revision() from public, anon, authenticated;
do $triggers$
declare t text;
begin
  foreach t in array array['crm_customers','crm_projects','crm_records','crm_ledger_entries','crm_notes','vault_attachments'] loop
    execute format('create trigger key_boundary before insert or update on public.%I for each row execute function private.vault_key_boundary()',t);
    execute format('create trigger revision_before_update before update on public.%I for each row execute function private.vault_revision()',t);
  end loop;
end;
$triggers$;

create function private.vault_attachment_parent() returns trigger language plpgsql set search_path = '' as $$
declare t text; found_id uuid;
begin
  if new.parent_kind = 'password' then return new; end if;
  t := case new.parent_kind when 'customer' then 'crm_customers' when 'project' then 'crm_projects'
    when 'record' then 'crm_records' when 'ledger' then 'crm_ledger_entries' when 'note' then 'crm_notes' end;
  if new.customer_id is null then raise exception 'Customer required'; end if;
  if new.parent_kind = 'customer' then
    if new.parent_id <> new.customer_id::text then raise exception 'Invalid parent'; end if;
  else
    execute format('select id from public.%I where id::text = $1 and user_id = $2 and customer_id = $3',t)
      into found_id using new.parent_id,new.user_id,new.customer_id;
    if found_id is null then raise exception 'Parent not found'; end if;
  end if;
  return new;
end $$;
revoke all on function private.vault_attachment_parent() from public;
create trigger attachment_parent before insert or update on public.vault_attachments for each row execute function private.vault_attachment_parent();

create function public.vault_save_record(p_id uuid,p_customer_id uuid,p_payload jsonb,p_revision bigint,p_projects uuid[],p_archived_at timestamptz default null)
returns public.crm_records language plpgsql security invoker set search_path = '' as $$
declare result public.crm_records; project uuid;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_revision = 0 then
    insert into public.crm_records(id,user_id,customer_id,payload) values(p_id,auth.uid(),p_customer_id,p_payload) returning * into result;
  else
    update public.crm_records set payload=p_payload,archived_at=p_archived_at
      where id=p_id and user_id=auth.uid() and customer_id=p_customer_id and revision=p_revision returning * into result;
    if result.id is null then raise exception 'VAULT_CONFLICT' using errcode='40001'; end if;
  end if;
  delete from public.crm_record_projects where record_id=p_id and user_id=auth.uid();
  foreach project in array coalesce(p_projects,array[]::uuid[]) loop
    insert into public.crm_record_projects(user_id,customer_id,record_id,project_id) values(auth.uid(),p_customer_id,p_id,project);
  end loop;
  return result;
end $$;
revoke all on function public.vault_save_record(uuid,uuid,jsonb,bigint,uuid[],timestamptz) from public,anon;
grant execute on function public.vault_save_record(uuid,uuid,jsonb,bigint,uuid[],timestamptz) to authenticated;

-- Preserve the existing (user_id,id) primary key and every existing value.
create table if not exists public.state_password_manager (
  user_id uuid not null default auth.uid() references auth.users(id), id text not null,
  value jsonb not null, updated_at timestamptz not null default now(), primary key(user_id,id)
);
alter table public.state_password_manager add column if not exists revision bigint not null default 0;
alter table public.state_password_manager add column if not exists encryption_version integer not null default 0;
alter table public.state_password_manager enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='state_password_manager') then
    create policy password_owner on public.state_password_manager for all to authenticated
      using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
  end if;
end $$;
-- Matches this legacy table's audited production privileges; the trigger,
-- rather than revoked legacy grants, prevents downgraded writes/deletes.
grant select,insert,update,delete on public.state_password_manager to authenticated,service_role;

create function private.guard_password_vault() returns trigger language plpgsql security definer set search_path = '' as $$
declare migrated boolean; key_id uuid;
begin
  select v.legacy_migrated,v.key_id into migrated,key_id from public.user_vaults v where v.user_id=coalesce(new.user_id,old.user_id);
  if tg_op='DELETE' then
    if coalesce(migrated,false) or old.encryption_version=1 then raise exception 'VAULT_UPGRADE_REQUIRED'; end if;
    return old;
  end if;
  if coalesce(migrated,false) or new.encryption_version=1 or (tg_op='UPDATE' and old.encryption_version=1) then
    if new.encryption_version<>1 or not private.vault_envelope_valid(new.value) or new.value->>'keyId'<>key_id::text then
      raise exception 'VAULT_UPGRADE_REQUIRED';
    end if;
  end if;
  if tg_op='UPDATE' then
    if new.user_id<>old.user_id or new.id<>old.id then raise exception 'Immutable identity'; end if;
    if old.encryption_version=1 then
      insert into public.vault_revisions(user_id,entity_table,entity_id,revision,payload)
        values(old.user_id,'state_password_manager',old.id,old.revision,old.value);
    end if;
    new.revision:=old.revision+1;
  else new.revision:=greatest(new.revision,1);
  end if;
  new.updated_at:=now();
  return new;
end $$;
revoke all on function private.guard_password_vault() from public,anon,authenticated;
create trigger password_vault_guard before insert or update or delete on public.state_password_manager
  for each row execute function private.guard_password_vault();

-- Definer is necessary ONLY to set the protected migration marker atomically.
create function public.vault_finish_password_migration(p_revision bigint,p_payload jsonb,p_backup_sha256 text)
returns void language plpgsql security definer set search_path = '' as $$
declare vault public.user_vaults; source public.state_password_manager;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  select * into vault from public.user_vaults where user_id=auth.uid() for update;
  if vault.user_id is null or not private.vault_envelope_valid(p_payload) or p_payload->>'keyId'<>vault.key_id::text then raise exception 'Invalid vault payload'; end if;
  if length(coalesce(p_backup_sha256,''))<>44 then raise exception 'Verified backup required'; end if;
  select * into source from public.state_password_manager where user_id=auth.uid() and id='lifeManagerPasswords' for update;
  if vault.legacy_migrated then
    if source.value=p_payload then return; else raise exception 'VAULT_CONFLICT' using errcode='40001'; end if;
  end if;
  if source.id is null then
    if p_revision<>0 then raise exception 'VAULT_CONFLICT' using errcode='40001'; end if;
    insert into public.state_password_manager(user_id,id,value,encryption_version) values(auth.uid(),'lifeManagerPasswords',p_payload,1);
  else
    if source.encryption_version=1 and source.value=p_payload then
      update public.user_vaults set legacy_migrated=true,migration_backup_sha256=p_backup_sha256 where user_id=auth.uid();
      return;
    end if;
    if source.revision<>p_revision then raise exception 'VAULT_CONFLICT' using errcode='40001'; end if;
    update public.state_password_manager set value=p_payload,encryption_version=1 where user_id=auth.uid() and id='lifeManagerPasswords';
  end if;
  update public.user_vaults set legacy_migrated=true,migration_backup_sha256=p_backup_sha256 where user_id=auth.uid();
end $$;
revoke all on function public.vault_finish_password_migration(bigint,jsonb,text) from public,anon;
grant execute on function public.vault_finish_password_migration(bigint,jsonb,text) to authenticated;

-- Restore only missing authenticated ciphertext history for this vault. Existing
-- revisions are immutable, including when an imported backup disagrees.
create function public.vault_restore_revision(p_row jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare owner_key uuid; existing jsonb;
begin
  if auth.uid() is null or p_row->>'user_id'<>auth.uid()::text then raise exception 'Unauthorized'; end if;
  select key_id into owner_key from public.user_vaults where user_id=auth.uid();
  if owner_key is null or not private.vault_envelope_valid(p_row->'payload') or p_row->'payload'->>'keyId'<>owner_key::text
    or p_row->>'entity_table' not in ('crm_customers','crm_projects','crm_records','crm_ledger_entries','crm_notes','vault_attachments','state_password_manager')
    or (p_row->>'revision')::bigint < 1 then raise exception 'Invalid revision'; end if;
  select payload into existing from public.vault_revisions where user_id=auth.uid() and entity_table=p_row->>'entity_table'
    and entity_id=p_row->>'entity_id' and revision=(p_row->>'revision')::bigint;
  if existing is not null then
    if existing<>p_row->'payload' then raise exception 'VAULT_CONFLICT'; end if;
    return;
  end if;
  insert into public.vault_revisions(user_id,entity_table,entity_id,revision,payload,archived_at,recorded_at)
    values(auth.uid(),p_row->>'entity_table',p_row->>'entity_id',(p_row->>'revision')::bigint,p_row->'payload',
      (p_row->>'archived_at')::timestamptz,(p_row->>'recorded_at')::timestamptz);
end $$;
revoke all on function public.vault_restore_revision(jsonb) from public,anon;
grant execute on function public.vault_restore_revision(jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lm-vault','lm-vault',false,20971648,array['application/octet-stream']);
create policy vault_files_select on storage.objects for select to authenticated
  using (bucket_id='lm-vault' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy vault_files_insert on storage.objects for insert to authenticated
  with check (bucket_id='lm-vault' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy vault_files_update on storage.objects for update to authenticated
  using (bucket_id='lm-vault' and (storage.foldername(name))[1]=(select auth.uid())::text)
  with check (bucket_id='lm-vault' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy vault_files_delete on storage.objects for delete to authenticated
  using (bucket_id='lm-vault' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Existing permissive policies must never broaden access to this new bucket.
create policy vault_files_owner_boundary on storage.objects as restrictive for all to authenticated
  using (bucket_id<>'lm-vault' or (storage.foldername(name))[1]=(select auth.uid())::text)
  with check (bucket_id<>'lm-vault' or (storage.foldername(name))[1]=(select auth.uid())::text);
create policy vault_files_no_anon on storage.objects as restrictive for all to anon
  using (bucket_id<>'lm-vault') with check (bucket_id<>'lm-vault');
grant usage on schema public to authenticated;
notify pgrst, 'reload schema';
commit;
