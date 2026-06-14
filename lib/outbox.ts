import { openDB, type IDBPDatabase } from 'idb';
import { supabase, SUPABASE_ENABLED } from './supabase';

/**
 * Durable write outbox.
 *
 * Every Supabase write (upsert / update / delete) is recorded in IndexedDB
 * BEFORE the optimistic local update, and only removed after the server
 * confirms success. On a flaky mobile connection a failed write is therefore
 * retried (on reconnect / focus / app start) instead of being silently lost.
 *
 * The optimistic in-memory update in the stores is unchanged — this only makes
 * the persistence durable and observable.
 */

const DB_NAME = 'lm-outbox';
const STORE = 'mutations';
const MAX_SERVER_RETRIES = 5;

export type OutboxMutation =
  | { kind: 'upsert'; table: string; values: unknown }
  | { kind: 'update'; table: string; values: Record<string, unknown>; match: Record<string, unknown> }
  | { kind: 'delete'; table: string; match: Record<string, unknown> };

export interface OutboxRecord {
  seq: number;
  mutation: OutboxMutation;
  createdAt: number;
  retries: number;
  lastError?: string;
}

export interface SyncStatus {
  pending: number;
  failed: number;
  syncing: boolean;
}

type Listener = (status: SyncStatus) => void;

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'seq', autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

const listeners = new Set<Listener>();
let syncing = false;
let lastFailed = 0;

async function notify(): Promise<void> {
  let pending = 0;
  try {
    const db = await getDB();
    pending = await db.count(STORE);
  } catch {
    /* ignore counting errors */
  }
  const status: SyncStatus = { pending, failed: lastFailed, syncing };
  listeners.forEach((l) => l(status));
}

export function subscribeSync(fn: Listener): () => void {
  listeners.add(fn);
  void notify();
  return () => {
    listeners.delete(fn);
  };
}

/** Record a mutation durably, then trigger a (best-effort) flush. */
export async function enqueue(mutation: OutboxMutation): Promise<void> {
  const db = await getDB();
  await db.add(STORE, { mutation, createdAt: Date.now(), retries: 0 });
  void notify();
  void flush();
}

/**
 * Execute a single mutation against a Supabase client. Pure w.r.t. storage so
 * it can be unit-tested with a mock client. Returns the Supabase error (or null).
 */
export async function applyMutation(
  client: typeof supabase,
  m: OutboxMutation,
): Promise<{ error: unknown | null }> {
  if (m.kind === 'upsert') {
    const { error } = await client.from(m.table).upsert(m.values as never);
    return { error: error ?? null };
  }
  if (m.kind === 'update') {
    const { error } = await client.from(m.table).update(m.values as never).match(m.match as never);
    return { error: error ?? null };
  }
  const { error } = await client.from(m.table).delete().match(m.match as never);
  return { error: error ?? null };
}

/**
 * Drain the queue in FIFO order.
 * - Network error (thrown): stop and keep everything for a later retry (order preserved).
 * - Server error (response with `error`): increment retry count; after MAX_SERVER_RETRIES
 *   leave it parked and skip so one poison row can't block the rest.
 */
export async function flush(): Promise<void> {
  if (!SUPABASE_ENABLED || syncing) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  syncing = true;
  void notify();
  let failed = 0;
  try {
    const db = await getDB();
    const keys = await db.getAllKeys(STORE);
    for (const key of keys) {
      const rec = (await db.get(STORE, key)) as OutboxRecord | undefined;
      if (!rec) continue;
      if (rec.retries >= MAX_SERVER_RETRIES) {
        failed += 1;
        continue;
      }
      try {
        const { error } = await applyMutation(supabase, rec.mutation);
        if (error) {
          rec.retries += 1;
          rec.lastError = String((error as { message?: string })?.message ?? error);
          await db.put(STORE, rec);
          failed += 1;
          continue;
        }
        await db.delete(STORE, key);
      } catch (e) {
        rec.lastError = String((e as Error)?.message ?? e);
        await db.put(STORE, rec);
        break;
      }
    }
    lastFailed = failed;
  } finally {
    syncing = false;
    void notify();
  }
}

let initialized = false;
/** Register reconnect/focus listeners and do an initial flush. Call once at app start. */
export function initOutbox(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('online', () => void flush());
  window.addEventListener('focus', () => void flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush();
  });
  void flush();
}
