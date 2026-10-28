import { decryptJson, encryptJson, type EncryptedEnvelope } from "./crypto";
import {
  assertContext,
  authenticateVaultClient,
  context,
  vaultClient,
} from "./session";
import {
  TABLES,
  type Entity,
  type EntityKind,
  type Payloads,
  type ServiceRecord,
} from "../customers/types";

export interface CipherRow {
  id: string;
  user_id: string;
  payload: EncryptedEnvelope;
  revision: number;
  archived_at: string | null;
  customer_id?: string;
  project_id?: string | null;
  created_at: string;
  updated_at: string;
}
export const purpose = (table: string, id: string, revision: number) =>
  `${table}/${id}/${revision}`;
export async function allRows<T>(
  table: string,
  filters: Record<string, string> = {},
): Promise<T[]> {
  const captured = context();
  const result: T[] = [];
  // Stable primary-key pagination, including projects containing >1000 rows.
  let after: string | null = null;
  for (;;) {
    let query = vaultClient
      .from(table)
      .select("*")
      .eq("user_id", captured.userId)
      .order("id")
      .limit(500);
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    if (after) query = query.gt("id", after);
    const { data, error } = await query;
    assertContext(captured);
    if (error)
      throw new Error(
        "دریافت اطلاعات کامل نشد. مانده و اطلاعات ناقص نمایش داده نمی‌شود.",
      );
    result.push(...(data as T[]));
    if (data.length < 500) break;
    after = data[data.length - 1].id;
  }
  return result;
}
export async function listEntities<K extends EntityKind>(
  kind: K,
): Promise<Entity<Payloads[K]>[]> {
  const captured = context();
  await authenticateVaultClient();
  const rows = await allRows<CipherRow>(TABLES[kind]);
  const entities: Entity<Payloads[K]>[] = [];
  for (const row of rows) {
    const data = await decryptJson<Payloads[K]>(
      row.payload,
      captured,
      purpose(TABLES[kind], row.id, row.revision),
    );
    entities.push({ ...row, data });
  }
  assertContext(captured);
  return entities;
}
export async function saveEntity<K extends EntityKind>(
  kind: K,
  data: Payloads[K],
  options: {
    id: string;
    revision: number;
    customerId?: string;
    projectId?: string | null;
    archivedAt?: string | null;
  },
): Promise<Entity<Payloads[K]>> {
  const captured = context(),
    table = TABLES[kind],
    revision = options.revision + 1;
  await authenticateVaultClient();
  assertContext(captured);
  const payload = await encryptJson(
    data,
    captured,
    purpose(table, options.id, revision),
  );
  assertContext(captured);
  const metadata = {
    id: options.id,
    user_id: captured.userId,
    payload,
    revision,
    archived_at: options.archivedAt ?? null,
    ...(options.customerId ? { customer_id: options.customerId } : {}),
    ...(kind === "ledger" ? { project_id: options.projectId || null } : {}),
  };
  let result: { data: unknown; error: { code?: string } | null };
  if (kind === "record") {
    result = await vaultClient.rpc("vault_save_record", {
      p_id: options.id,
      p_customer_id: options.customerId,
      p_payload: payload,
      p_revision: options.revision,
      p_projects: [...new Set((data as ServiceRecord).projectIds)],
      p_archived_at: options.archivedAt ?? null,
    });
  } else if (!options.revision) {
    result = await vaultClient
      .from(table)
      .insert(metadata)
      .select("*")
      .single();
  } else {
    result = await vaultClient
      .from(table)
      .update(metadata)
      .eq("id", options.id)
      .eq("user_id", captured.userId)
      .eq("revision", options.revision)
      .select("*")
      .maybeSingle();
  }
  assertContext(captured);
  if (result.error || !result.data) {
    // An interrupted HTTP response may have committed already. Read back before
    // reporting a conflict; retries never turn into a second financial entry.
    const { data: existing } = await vaultClient
      .from(table)
      .select("*")
      .eq("id", options.id)
      .eq("user_id", captured.userId)
      .maybeSingle();
    assertContext(captured);
    if (
      existing &&
      existing.revision === revision &&
      existing.archived_at === metadata.archived_at &&
      (!options.customerId || existing.customer_id === options.customerId) &&
      (kind !== "ledger" || existing.project_id === (options.projectId || null))
    ) {
      const readBack = await decryptJson<Payloads[K]>(
        existing.payload,
        captured,
        purpose(table, existing.id, existing.revision),
      );
      if (JSON.stringify(readBack) === JSON.stringify(data))
        return { ...existing, data: readBack };
    }
    throw new Error(
      "ذخیره تأیید نشد یا این مورد روی دستگاه دیگری تغییر کرده است؛ پیش‌نویس حفظ شد. دوباره بارگذاری کنید.",
    );
  }
  return { ...(result.data as CipherRow), data };
}
export async function history(
  kind: EntityKind | "password",
  id: string,
): Promise<{ revision: number; recorded_at: string; data: unknown }[]> {
  const captured = context();
  const table = kind === "password" ? "state_password_manager" : TABLES[kind];
  const result = [];
  let before: number | null = null;
  for (;;) {
    let query = vaultClient
      .from("vault_revisions")
      .select("*")
      .eq("user_id", captured.userId)
      .eq("entity_table", table)
      .eq("entity_id", id)
      .order("revision", { ascending: false })
      .limit(500);
    if (before !== null) query = query.lt("revision", before);
    const { data, error } = await query;
    assertContext(captured);
    if (error) throw new Error("دریافت تاریخچه ناموفق بود.");
    for (const row of data)
      result.push({
        revision: row.revision,
        recorded_at: row.recorded_at,
        data: await decryptJson(
          row.payload,
          captured,
          purpose(table, id, row.revision),
        ),
      });
    if (data.length < 500) break;
    before = data[data.length - 1].revision;
  }
  assertContext(captured);
  return result;
}
