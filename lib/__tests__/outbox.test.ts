import { describe, it, expect } from 'vitest';
import { applyMutation, type OutboxMutation } from '../outbox';

interface RecordedCall {
  op: string;
  table: string;
  values?: unknown;
  match?: unknown;
}

function makeMockClient(error: unknown = null) {
  const calls: RecordedCall[] = [];
  const client = {
    from(table: string) {
      return {
        upsert(values: unknown) {
          calls.push({ op: 'upsert', table, values });
          return Promise.resolve({ error });
        },
        update(values: unknown) {
          return {
            match(match: unknown) {
              calls.push({ op: 'update', table, values, match });
              return Promise.resolve({ error });
            },
          };
        },
        delete() {
          return {
            match(match: unknown) {
              calls.push({ op: 'delete', table, match });
              return Promise.resolve({ error });
            },
          };
        },
      };
    },
    calls,
  };
  return client;
}

describe('applyMutation', () => {
  it('maps an upsert to from(table).upsert(values)', async () => {
    const client = makeMockClient();
    const m: OutboxMutation = { kind: 'upsert', table: 'transactions', values: { id: '1', amount: 5 } };
    const res = await applyMutation(client as never, m);
    expect(res.error).toBeNull();
    expect(client.calls).toEqual([{ op: 'upsert', table: 'transactions', values: { id: '1', amount: 5 } }]);
  });

  it('maps an update to from(table).update(values).match(match)', async () => {
    const client = makeMockClient();
    const m: OutboxMutation = { kind: 'update', table: 'checks', values: { status: 'cashed' }, match: { id: 'c1' } };
    await applyMutation(client as never, m);
    expect(client.calls).toEqual([{ op: 'update', table: 'checks', values: { status: 'cashed' }, match: { id: 'c1' } }]);
  });

  it('maps a delete to from(table).delete().match(match)', async () => {
    const client = makeMockClient();
    const m: OutboxMutation = { kind: 'delete', table: 'people', match: { id: 'p1' } };
    await applyMutation(client as never, m);
    expect(client.calls).toEqual([{ op: 'delete', table: 'people', match: { id: 'p1' } }]);
  });

  it('passes through a Supabase error instead of throwing', async () => {
    const client = makeMockClient({ message: 'boom' });
    const res = await applyMutation(client as never, { kind: 'upsert', table: 't', values: {} });
    expect(res.error).toEqual({ message: 'boom' });
  });
});
