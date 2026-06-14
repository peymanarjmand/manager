-- ============================================================================
-- ROLLBACK SCRIPT — recreates the permissive ("open to everyone") RLS policies
-- that were dropped in Phase 1 (security) on 2026-06-14.
-- Run this ONLY if dropping them caused an unexpected problem.
-- Project: hzloraflhftrxcokbvkv
--
-- NOTE: These policies are INSECURE by design (they allowed anonymous full
-- access). This file exists purely as an emergency undo. The correct
-- per-user policies ("Users can manage their own X") were left in place and
-- are NOT recreated here (they were never dropped).
-- ============================================================================

-- Standard "<table> anon all": FOR ALL TO public USING (true) WITH CHECK (true)
create policy "assets anon all" on public.assets for all to public using (true) with check (true);
create policy "checks anon all" on public.checks for all to public using (true) with check (true);
create policy "contact_emails anon all" on public.contact_emails for all to public using (true) with check (true);
create policy "contact_tels anon all" on public.contact_tels for all to public using (true) with check (true);
create policy "contacts anon all" on public.contacts for all to public using (true) with check (true);
create policy "darfak_expenses anon all" on public.darfak_expenses for all to public using (true) with check (true);
create policy "installment_payments anon all" on public.installment_payments for all to public using (true) with check (true);
create policy "installment_plans anon all" on public.installment_plans for all to public using (true) with check (true);
create policy "ledger_entries anon all" on public.ledger_entries for all to public using (true) with check (true);
create policy "password_entries anon all" on public.password_entries for all to public using (true) with check (true);
create policy "people anon all" on public.people for all to public using (true) with check (true);
create policy "projects anon all" on public.projects for all to public using (true) with check (true);
create policy "settings anon all" on public.settings for all to public using (true) with check (true);
create policy "state_accountant anon all" on public.state_accountant for all to public using (true) with check (true);
create policy "state_auth anon all" on public.state_auth for all to public using (true) with check (true);
create policy "state_daily_tasks anon all" on public.state_daily_tasks for all to public using (true) with check (true);
create policy "state_darfak anon all" on public.state_darfak for all to public using (true) with check (true);
create policy "state_password_manager anon all" on public.state_password_manager for all to public using (true) with check (true);
create policy "state_phone_book anon all" on public.state_phone_book for all to public using (true) with check (true);
create policy "state_settings anon all" on public.state_settings for all to public using (true) with check (true);
create policy "subtasks anon all" on public.subtasks for all to public using (true) with check (true);
create policy "task_tags anon all" on public.task_tags for all to public using (true) with check (true);
create policy "tasks anon all" on public.tasks for all to public using (true) with check (true);
create policy "transactions anon all" on public.transactions for all to public using (true) with check (true);

-- kv_store per-command anon policies
create policy "kv select anon" on public.kv_store for select to public using (true);
create policy "kv insert anon" on public.kv_store for insert to public with check (true);
create policy "kv update anon" on public.kv_store for update to public using (true);
create policy "kv delete anon" on public.kv_store for delete to public using (true);

-- monthly_funds per-command (anon, authenticated)
create policy "monthly_funds_all_read" on public.monthly_funds for select to anon, authenticated using (true);
create policy "monthly_funds_all_write" on public.monthly_funds for insert to anon, authenticated with check (true);
create policy "monthly_funds_all_update" on public.monthly_funds for update to anon, authenticated using (true) with check (true);
create policy "monthly_funds_all_delete" on public.monthly_funds for delete to anon, authenticated using (true);
