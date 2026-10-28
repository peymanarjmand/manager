begin;
-- Additive only: legacy paid rows retain their amount, status and paid date.
alter table public.installment_payments add column receipt_history jsonb not null default '[]'::jsonb
  check (jsonb_typeof(receipt_history) = 'array');

create function private.validate_installment_receipts() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  previous jsonb := '[]'::jsonb;
  item jsonb; before_item jsonb; i integer;
  paid numeric := 0; n numeric; total numeric;
  last_date timestamptz;
begin
  if tg_op = 'UPDATE' then previous := old.receipt_history; end if;
  if jsonb_typeof(new.receipt_history) <> 'array' or jsonb_array_length(new.receipt_history) < jsonb_array_length(previous) then
    raise exception 'Payment history cannot be removed';
  end if;
  total := coalesce(new.amount,0) + coalesce(new.penalty,0);
  for i in 0..jsonb_array_length(new.receipt_history)-1 loop
    item := new.receipt_history->i;
    if jsonb_typeof(item) <> 'object' or item->>'id' is null or item->>'paidAt' is null or jsonb_typeof(item->'amount') is distinct from 'number' then
      raise exception 'Invalid payment record';
    end if;
    perform (item->>'id')::uuid;
    perform (item->>'paidAt')::timestamptz;
    n := (item->>'amount')::numeric;
    if n <= 0 or n <> trunc(n) or n > 9007199254740991 then raise exception 'Invalid payment amount'; end if;
    if i < jsonb_array_length(previous) then
      before_item := previous->i;
      if (item - 'voidedAt') <> (before_item - 'voidedAt') or
        (before_item->>'voidedAt' is not null and item->>'voidedAt' is distinct from before_item->>'voidedAt') then
        raise exception 'Existing payment records are immutable';
      end if;
    end if;
    if item->>'voidedAt' is not null then perform (item->>'voidedAt')::timestamptz;
    else
      paid := paid + n;
      last_date := greatest(last_date,(item->>'paidAt')::timestamptz);
    end if;
  end loop;
  if (select count(*) <> count(distinct e->>'id') from jsonb_array_elements(new.receipt_history) e) then
    raise exception 'Duplicate payment identifier';
  end if;
  if tg_op='UPDATE' and jsonb_array_length(previous)=0 and old.is_paid and new.receipt_history <> previous then
    raise exception 'This legacy installment is already settled';
  end if;
  if jsonb_array_length(new.receipt_history)>0 then
    if paid > total then raise exception 'Payment exceeds remaining installment balance'; end if;
    new.is_paid := paid >= total;
    new.paid_date := case when new.is_paid then last_date else null end;
  end if;
  return new;
end $$;
revoke all on function private.validate_installment_receipts() from public,anon,authenticated;
create trigger protect_installment_receipts before insert or update of receipt_history,amount,penalty,is_paid,paid_date
on public.installment_payments for each row execute function private.validate_installment_receipts();

create function public.record_installment_receipt(p_payment_id text,p_receipt jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare row_data public.installment_payments; existing jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into row_data from public.installment_payments
  where id=p_payment_id and user_id=auth.uid() for update;
  if not found then raise exception 'Installment not found'; end if;
  select e into existing from jsonb_array_elements(row_data.receipt_history) e where e->>'id'=p_receipt->>'id';
  if existing is not null then
    if existing - 'voidedAt' <> p_receipt - 'voidedAt' then raise exception 'Payment identifier conflict'; end if;
    return to_jsonb(row_data);
  end if;
  if p_receipt->>'voidedAt' is not null then raise exception 'New payment must be active'; end if;
  update public.installment_payments set receipt_history=receipt_history||jsonb_build_array(p_receipt)
  where id=p_payment_id and user_id=auth.uid() returning * into row_data;
  return to_jsonb(row_data);
end $$;

create function public.void_installment_receipt(p_payment_id text,p_receipt_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare row_data public.installment_payments; next_history jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into row_data from public.installment_payments
  where id=p_payment_id and user_id=auth.uid() for update;
  if not found then raise exception 'Installment not found'; end if;
  if not exists(select 1 from jsonb_array_elements(row_data.receipt_history) e where e->>'id'=p_receipt_id::text) then
    raise exception 'Payment record not found';
  end if;
  select jsonb_agg(case when e->>'id'=p_receipt_id::text and e->>'voidedAt' is null
    then e||jsonb_build_object('voidedAt',clock_timestamp()) else e end order by ordinal)
  into next_history from jsonb_array_elements(row_data.receipt_history) with ordinality a(e,ordinal);
  update public.installment_payments set receipt_history=next_history
  where id=p_payment_id and user_id=auth.uid() returning * into row_data;
  return to_jsonb(row_data);
end $$;
revoke all on function public.record_installment_receipt(text,jsonb) from public,anon,authenticated;
revoke all on function public.void_installment_receipt(text,uuid) from public,anon,authenticated;
grant execute on function public.record_installment_receipt(text,jsonb) to authenticated;
grant execute on function public.void_installment_receipt(text,uuid) to authenticated;
-- Existing table grants and ownership RLS stay in force; no new API table.
notify pgrst, 'reload schema';
commit;
