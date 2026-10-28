-- Cover both ownership-preserving foreign keys on shared service/project links.
-- No row values, grants or policies change.
begin;
set local lock_timeout='5s';
create index crm_record_projects_record_owner_fk_idx
  on public.crm_record_projects(user_id,customer_id,record_id);
create index crm_record_projects_project_owner_fk_idx
  on public.crm_record_projects(user_id,customer_id,project_id);
commit;
