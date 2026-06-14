/**
 * Generate a new unique id for a record.
 *
 * Uses crypto.randomUUID() (collision-proof) when available, with a
 * timestamp+random fallback for very old / insecure contexts. Replaces the
 * previous `Date.now().toString()` ids, which could collide when two records
 * were created in the same millisecond (e.g. a fast double-tap "quick add"),
 * silently overwriting one financial row via upsert.
 *
 * Existing ids are never changed — this only affects newly created records.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
