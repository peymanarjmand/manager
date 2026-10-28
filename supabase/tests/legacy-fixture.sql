-- LOCAL TEST FIXTURE ONLY. Never execute against a remote project.
insert into storage.buckets(id,name,public) values('lm-images','lm-images',false) on conflict do nothing;
do $$ begin
if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='local_legacy_owner') then
  create policy local_legacy_owner on storage.objects for select to authenticated
  using(bucket_id='lm-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
end if;end $$;
do $$ declare t text; begin
  foreach t in array array['state_settings','state_phone_book','state_daily_tasks','state_accountant','kv_store'] loop
    execute format('create table if not exists public.%I(user_id uuid not null default auth.uid() references auth.users(id),id text not null,value jsonb not null,updated_at timestamptz not null default now(),primary key(user_id,id))',t);
    execute format('alter table public.%I enable row level security',t);
    if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname='local_owner') then
      execute format('create policy local_owner on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
    end if;
    execute format('grant select,insert,update,delete on public.%I to authenticated,service_role',t);
  end loop;
end $$;
