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

-- Isolated accountant fixtures mirror the existing production table shapes.
create table if not exists public.installment_plans (
  id text primary key, title text, loan_amount numeric default 0,
  user_id uuid not null default auth.uid() references auth.users(id)
);
create table if not exists public.installment_payments (
  id text primary key, plan_id text references public.installment_plans(id) on delete cascade,
  amount numeric, due_date timestamptz, is_paid boolean default false,
  paid_date timestamptz, penalty numeric default 0,
  user_id uuid not null default auth.uid() references auth.users(id)
);
alter table public.installment_plans enable row level security;
alter table public.installment_payments enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='installment_plans' and policyname='local_installment_owner') then
    create policy local_installment_owner on public.installment_plans for all to authenticated
      using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='installment_payments' and policyname='local_installment_owner') then
    create policy local_installment_owner on public.installment_payments for all to authenticated
      using((select auth.uid())=user_id) with check((select auth.uid())=user_id and exists(select 1 from public.installment_plans p where p.id=plan_id and p.user_id=(select auth.uid())));
  end if;
end $$;
grant select,insert,update,delete on public.installment_plans to authenticated,service_role;
grant select,insert,update,delete on public.installment_payments to authenticated,service_role;
