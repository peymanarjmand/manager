// Per-entity data-access layer for the Smart Accountant module: column lists,
// row->domain mappers, and domain->row builders. Pure (no Supabase import) so
// the store and the legacy-migration path share one source of truth for the
// table mapping, and the mappers can be unit-tested in isolation.
export * from './transactions';
export * from './assets';
export * from './people';
export * from './installments';
export * from './checks';
export * from './darfak';
export * from './socialInsurance';
export * from './funds';
