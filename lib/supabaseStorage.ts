import { supabase, SUPABASE_ENABLED } from './supabase';

// Supabase-backed KV storage for persisted JSON states with local fallback
// Table schema expectation:
// create table if not exists kv_store (
//   id text primary key,
//   value jsonb not null,
//   updated_at timestamptz default now()
// );

export const supabaseStateStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!SUPABASE_ENABLED) return null;
    const { data, error } = await supabase
      .from('kv_store')
      .select('value')
      .eq('id', key)
      .maybeSingle();

    if (error) {
      console.warn('Supabase getItem error', { key, error });
      return null;
    }
    if (!data || data.value == null) return null;
    try {
      return JSON.stringify(data.value);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!SUPABASE_ENABLED) return;
    let jsonValue: any = null;
    try {
      jsonValue = JSON.parse(value);
    } catch {
      jsonValue = { _raw: value };
    }
    const { error } = await supabase
      .from('kv_store')
      .upsert({ id: key, value: jsonValue, updated_at: new Date().toISOString() });
    if (error) {
      console.error('Supabase setItem error', { key, error });
    }
  },
  async removeItem(key: string): Promise<void> {
    if (!SUPABASE_ENABLED) return;
    const { error } = await supabase
      .from('kv_store')
      .delete()
      .eq('id', key);
    if (error) {
      console.error('Supabase removeItem error', { key, error });
    }
  },
};

// Factory: create a Supabase-backed StateStorage for a specific table
// Expected table schema: { id text primary key, value jsonb not null, updated_at timestamptz default now() }
export function createSupabaseTableStateStorage(tableName: string) {
  return {
    async getItem(key: string): Promise<string | null> {
      if (!SUPABASE_ENABLED) return null;
      const { data, error } = await supabase
        .from(tableName)
        .select('value')
        .eq('id', key)
        .maybeSingle();
      if (error) {
        console.warn('Supabase getItem error', { tableName, key, error });
        return null;
      }
      if (!data || data.value == null) return null;
      try {
        return JSON.stringify(data.value);
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      if (!SUPABASE_ENABLED) return;
      let jsonValue: any = null;
      try {
        jsonValue = JSON.parse(value);
      } catch {
        jsonValue = { _raw: value };
      }
      const { error } = await supabase
        .from(tableName)
        .upsert({ id: key, value: jsonValue, updated_at: new Date().toISOString() });
      if (error) {
        console.error('Supabase setItem error', { tableName, key, error });
      }
    },
    async removeItem(key: string): Promise<void> {
      if (!SUPABASE_ENABLED) return;
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', key);
      if (error) {
        console.error('Supabase removeItem error', { tableName, key, error });
      }
    },
  };
}