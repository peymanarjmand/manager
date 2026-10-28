# Database changes

- Supabase project: `hzloraflhftrxcokbvkv`. Production contains personal data.
- Read `supabase/README.md` before changing database objects or permissions.
- Since 2026-10-30, new `public` tables need explicit Data API grants. Do not
  depend on automatic exposure or restore broad default privileges.
- Create each new API table, enable RLS, define ownership policies, and grant
  only the required privileges in the same migration/transaction. Follow
  `supabase/templates/user-owned-table.sql` for a new user-owned table.
- The app uses Supabase Auth. Do not grant anonymous access or add permissive
  `USING (true)` policies to make a feature work. Existing anonymous grants are
  protected by ownership RLS; do not change existing grants/policies incidentally.
- Grant sequence USAGE only on the specific sequence when a table actually
  needs it. Never use grants on all tables, all sequences, or all functions.
- Preserve existing data and ownership. Do not drop/recreate tables, reset a
  remote database, or run scripts under `backups/` to fix an access error.
- Before and after a database change, run `supabase/verify-data-api-access.sql`
  and review affected RLS policies. Add new application tables to its manifest
  and to `supabase/replay-data-api-grants.sql` when appropriate.
- Test fresh-schema migrations only in an isolated development database with
  automatic exposure disabled. Never use production as a reset/test database.
- Keep service-role keys out of the frontend. Respect read-only MCP settings.
