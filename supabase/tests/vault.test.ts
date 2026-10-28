import { beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { localConfig as cfg } from "./local-config";
vi.mock("../../lib/supabase", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { localConfig: cfg } = await import("./local-config");
  if (cfg.API_URL !== "http://127.0.0.1:54321")
    throw new Error("Local tests must never target a remote database.");
  return {
    SUPABASE_URL: cfg.API_URL,
    SUPABASE_ANON_KEY: cfg.ANON_KEY,
    SUPABASE_ENABLED: true,
    supabase: createClient(cfg.API_URL, cfg.ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "local-main-test",
      },
    }),
  };
});
import { supabase } from "../../lib/supabase";
import {
  acceptCreatedVault,
  context,
  lockVault,
  useVaultSession,
  vaultClient,
} from "../../features/vault/session";
import {
  createVault,
  decryptJson,
  encryptJson,
} from "../../features/vault/crypto";
import {
  allRows,
  history,
  listEntities,
  purpose,
  saveEntity,
} from "../../features/vault/repository";
import {
  finishMigration,
  prepareMigration,
} from "../../features/vault/migration";
import {
  buildBackup,
  restoreBackup,
  verifyBackup,
} from "../../features/vault/backup";
import {
  listAttachments,
  readImage,
  uploadImage,
} from "../../features/vault/attachments";
import {
  emptyEntries,
  loadPasswords,
  savePassword,
  usePasswordStore,
} from "../../features/password-manager/store";
import { reloadCustomers, useCustomers } from "../../features/customers/store";
import { balance } from "../../features/customers/domain";

if (cfg.API_URL !== "http://127.0.0.1:54321")
  throw new Error("Only the isolated localhost database is authorized.");
const admin = createClient(cfg.API_URL, cfg.SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "local-admin",
  },
});
const other = createClient(cfg.API_URL, cfg.ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "local-other",
  },
});
const anon = createClient(cfg.API_URL, cfg.ANON_KEY, {
  auth: { persistSession: false, storageKey: "local-anon" },
});
let userId: string,
  otherId: string,
  customerId: string,
  projectId: string,
  prepared: Awaited<ReturnType<typeof prepareMigration>>;
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1kAAAAASUVORK5CYII=",
    "base64",
  ),
);
const password = "local-test-long-password-123";
describe("isolated vault schema, migration and client integration", () => {
  beforeAll(async () => {
    const email = `vault-${crypto.randomUUID()}@example.test`,
      email2 = `vault-${crypto.randomUUID()}@example.test`;
    const a = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
      b = await admin.auth.admin.createUser({
        email: email2,
        password,
        email_confirm: true,
      });
    if (a.error || b.error) throw new Error("Creating local fixtures failed");
    userId = a.data.user!.id;
    otherId = b.data.user!.id;
    expect(
      (await supabase.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();
    expect(
      (await other.auth.signInWithPassword({ email: email2, password })).error,
    ).toBeNull();
    const entries = emptyEntries();
    entries.emails.push({
      id: "legacy-kept-id",
      category: "emails",
      email: "private@example.test",
      password: "۱۲۳ secret",
      image: `lmimg:${userId}/legacy.png`,
    });
    expect(
      (
        await admin.storage
          .from("lm-images")
          .upload(`${userId}/legacy.png`, png, { contentType: "image/png" })
      ).error,
    ).toBeNull();
    expect(
      (
        await supabase
          .from("state_password_manager")
          .insert({
            id: "lifeManagerPasswords",
            value: { state: { entries }, version: 0 },
          })
      ).error,
    ).toBeNull();
    useVaultSession.setState({ userId, status: "missing" });
    await acceptCreatedVault(await createVault(userId, password));
  });
  it("backs up and verifies images before replacing legacy plaintext", async () => {
    const actualFetch = globalThis.fetch;
    let interrupt = true;
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        if (
          interrupt &&
          String(input).includes("/rest/v1/vault_attachments") &&
          init?.method === "PATCH"
        ) {
          interrupt = false;
          return new Response('{"message":"forced interruption"}', {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return actualFetch(input, init);
      });
    try {
      await expect(prepareMigration()).rejects.toThrow();
    } finally {
      spy.mockRestore();
    }
    expect(
      (
        await supabase
          .from("state_password_manager")
          .select("encryption_version")
          .eq("id", "lifeManagerPasswords")
          .single()
      ).data.encryption_version,
    ).toBe(0);
    prepared = await prepareMigration();
    expect(prepared.count).toBe(1);
    expect(prepared.imageCount).toBe(1);
    const current = await supabase
      .from("state_password_manager")
      .select("*")
      .eq("id", "lifeManagerPasswords")
      .single();
    expect(current.data.encryption_version).toBe(0);
    expect(
      (
        await listAttachments({ kind: "password", id: "legacy-kept-id" })
      ).filter((x) => x.status === "ready"),
    ).toHaveLength(1);
    expect(await verifyBackup(prepared.backup)).toBeTruthy();
    expect(new TextDecoder().decode(prepared.backup)).not.toContain(
      "private@example.test",
    );
  });
  it("rejects a concurrent legacy edit, resumes without duplicating images and prevents downgrade", async () => {
    const source = (
      await supabase
        .from("state_password_manager")
        .select("*")
        .eq("id", "lifeManagerPasswords")
        .single()
    ).data;
    const changed = structuredClone(source.value);
    changed.state.entries.emails[0].description = "new preserved note";
    expect(
      (
        await supabase
          .from("state_password_manager")
          .update({ value: changed })
          .eq("id", "lifeManagerPasswords")
      ).error,
    ).toBeNull();
    await expect(finishMigration(prepared)).rejects.toThrow();
    expect(
      (
        await supabase
          .from("state_password_manager")
          .select("encryption_version")
          .eq("id", "lifeManagerPasswords")
          .single()
      ).data.encryption_version,
    ).toBe(0);
    prepared = await prepareMigration();
    await finishMigration(prepared);
    await finishMigration(prepared);
    expect(
      (
        await listAttachments({ kind: "password", id: "legacy-kept-id" })
      ).filter((x) => x.status === "ready"),
    ).toHaveLength(1);
    await loadPasswords();
    expect(usePasswordStore.getState().entries.emails[0].id).toBe(
      "legacy-kept-id",
    );
    expect(usePasswordStore.getState().entries.emails[0].description).toBe(
      "new preserved note",
    );
    expect(
      (
        await supabase
          .from("state_password_manager")
          .update({ value: source.value, encryption_version: 0 })
          .eq("id", "lifeManagerPasswords")
      ).error,
    ).toBeTruthy();
    expect(
      (
        await supabase
          .from("state_password_manager")
          .delete()
          .eq("id", "lifeManagerPasswords")
      ).error?.message,
    ).toContain("VAULT_UPGRADE_REQUIRED");
  });
  it("saves owned customers and multiple projects with atomic service links", async () => {
    customerId = crypto.randomUUID();
    projectId = crypto.randomUUID();
    await saveEntity(
      "customer",
      {
        firstName: "علی",
        lastName: "آزمایشی",
        mobiles: [{ label: "", value: "09123456789" }],
        phones: [],
        emails: [],
      },
      { id: customerId, revision: 0 },
    );
    for (const id of [projectId, crypto.randomUUID()])
      await saveEntity(
        "project",
        { title: "پروژه آزمایشی", type: "website", status: "active" },
        { id, revision: 0, customerId },
      );
    const record = await saveEntity(
      "record",
      {
        title: "GitHub",
        type: "github",
        fields: { password: "private-key" },
        customFields: [],
        recoveryCodes: [],
        projectIds: [projectId],
      },
      { id: crypto.randomUUID(), revision: 0, customerId },
    );
    expect(
      (
        await vaultClient
          .from("crm_record_projects")
          .select("*")
          .eq("record_id", record.id)
      ).data,
    ).toHaveLength(1);
    const second = await saveEntity(
      "record",
      {
        ...record.data,
        title: "GitHub دوم",
        projectIds: (await listEntities("project")).map((p) => p.id),
      },
      { id: crypto.randomUUID(), revision: 0, customerId },
    );
    expect(
      (
        await vaultClient
          .from("crm_record_projects")
          .select("*")
          .eq("record_id", second.id)
      ).data,
    ).toHaveLength(2);
    expect(
      (await other.from("crm_customers").select("*").eq("id", customerId)).data,
    ).toEqual([]);
    expect((await anon.from("crm_customers").select("*")).error).toBeTruthy();
    const foreignCustomer = crypto.randomUUID(),
      c = await createVault(otherId, password),
      ctx = { userId: otherId, keyId: c.metadata.key_id, key: c.key, epoch: 1 };
    expect(
      (await other.from("user_vaults").insert(c.metadata)).error,
    ).toBeNull();
    const payload = await encryptJson(
      { title: "cross-owner" },
      ctx,
      purpose("crm_projects", foreignCustomer, 1),
    );
    expect(
      (
        await other
          .from("crm_projects")
          .insert({
            id: foreignCustomer,
            user_id: otherId,
            customer_id: customerId,
            payload,
          })
      ).error,
    ).toBeTruthy();
    expect(
      (await supabase.from("crm_customers").delete().eq("id", customerId))
        .error,
    ).toBeTruthy();
  });
  it("retains financial history, CAS conflicts and idempotent retry", async () => {
    const id = crypto.randomUUID(),
      data = {
        type: "expense" as const,
        title: "سرور",
        amount: "5000000",
        occurredAt: "2026-10-27T10:00:00Z",
      };
    const options = { id, revision: 0, customerId, projectId };
    await saveEntity("ledger", data, options);
    await saveEntity("ledger", data, options);
    expect(
      (await listEntities("ledger")).filter((r) => r.id === id),
    ).toHaveLength(1);
    await saveEntity(
      "ledger",
      { ...data, amount: "4000000" },
      { ...options, revision: 1 },
    );
    await expect(
      saveEntity(
        "ledger",
        { ...data, amount: "6000000" },
        { ...options, revision: 1 },
      ),
    ).rejects.toThrow();
    expect((await history("ledger", id))[0].data).toMatchObject({
      amount: "5000000",
    });
    await saveEntity(
      "ledger",
      { ...data, amount: "4000000", voided: true },
      { ...options, revision: 2 },
    );
    expect(await history("ledger", id)).toHaveLength(2);
    const general = await saveEntity(
      "ledger",
      { ...data, type: "receipt", amount: "2000000", method: "نقد" },
      { id: crypto.randomUUID(), revision: 0, customerId, projectId: "" },
    );
    expect(general.project_id).toBeNull();
    const realFetch = globalThis.fetch;
    let lost = false;
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const response = await realFetch(input, init);
        if (
          !lost &&
          String(input).includes("/rest/v1/crm_ledger_entries") &&
          init?.method === "POST" &&
          response.ok
        ) {
          lost = true;
          return new Response('{"message":"lost response after commit"}', {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return response;
      });
    const retryId = crypto.randomUUID();
    try {
      await saveEntity(
        "ledger",
        { ...data, title: "response lost" },
        { id: retryId, revision: 0, customerId },
      );
    } finally {
      spy.mockRestore();
    }
    expect(lost).toBe(true);
    expect(
      (await listEntities("ledger")).filter((e) => e.id === retryId),
    ).toHaveLength(1);
  });
  it("owns encrypted storage objects and validates an exact original image round trip", async () => {
    const image = await uploadImage(
      new File([png], "private-image.png", { type: "image/png" }),
      { kind: "customer", id: customerId },
      customerId,
      "روی کارت ملی",
    );
    expect(
      new Uint8Array(await (await readImage(image)).arrayBuffer()),
    ).toEqual(png);
    expect(
      (await other.storage.from("lm-vault").download(image.object_path)).error,
    ).toBeTruthy();
    expect(
      (await anon.storage.from("lm-vault").download(image.object_path)).error,
    ).toBeTruthy();
    expect(
      (
        await other.storage
          .from("lm-vault")
          .upload(`${userId}/${crypto.randomUUID()}.bin`, png, {
            contentType: "application/octet-stream",
          })
      ).error,
    ).toBeTruthy();
    expect(
      (await vaultClient.storage.from("lm-vault").download(image.object_path))
        .data?.type,
    ).toBe("application/octet-stream");
  });
  it("fetches more than 1000 encrypted records without silently truncating balances", async () => {
    const before = balance(await listEntities("ledger"));
    const ctx = context(),
      rows = [];
    for (let n = 0; n < 1005; n++) {
      const id = crypto.randomUUID();
      rows.push({
        id,
        user_id: userId,
        customer_id: customerId,
        revision: 1,
        payload: await encryptJson(
          { title: `note ${n}`, text: "" },
          ctx,
          purpose("crm_notes", id, 1),
        ),
      });
    }
    for (let n = 0; n < rows.length; n += 100)
      expect(
        (await vaultClient.from("crm_notes").insert(rows.slice(n, n + 100)))
          .error,
      ).toBeNull();
    expect(await allRows("crm_notes")).toHaveLength(1005);
    await reloadCustomers();
    expect(useCustomers.getState().notes).toHaveLength(1005);
    const financial = [];
    for (let n = 0; n < 1005; n++) {
      const id = crypto.randomUUID();
      financial.push({
        id,
        user_id: userId,
        customer_id: customerId,
        revision: 1,
        payload: await encryptJson(
          {
            type: "charge",
            title: "حق‌الزحمه",
            amount: "1",
            occurredAt: "2026-10-27T10:00:00Z",
          },
          ctx,
          purpose("crm_ledger_entries", id, 1),
        ),
      });
    }
    for (let n = 0; n < financial.length; n += 100)
      expect(
        (
          await vaultClient
            .from("crm_ledger_entries")
            .insert(financial.slice(n, n + 100))
        ).error,
      ).toBeNull();
    await reloadCustomers();
    expect(balance(useCustomers.getState().ledger)).toBe(before + 1005n);
  });
  it("verifies a complete encrypted backup and restores it idempotently without overwriting current data", async () => {
    await savePassword("emails", {
      ...usePasswordStore.getState().entries.emails[0],
      description: "encrypted change",
    });
    const bytes = await buildBackup(),
      verified = await verifyBackup(bytes);
    expect(verified.manifest.tables.crm_notes).toHaveLength(1005);
    await restoreBackup(verified);
    await restoreBackup(verified);
    // Simulate a privileged accidental deletion ONLY in this named disposable
    // localhost fixture, then exercise a genuine restore including all history.
    for (const table of [
      "vault_attachments",
      "crm_record_projects",
      "crm_notes",
      "crm_ledger_entries",
      "crm_records",
      "crm_projects",
      "crm_customers",
    ])
      expect(
        (await admin.from(table).delete().eq("user_id", userId)).error,
      ).toBeNull();
    if (!/^[0-9a-f-]{36}$/.test(userId))
      throw new Error("Invalid fixture owner");
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_myapp",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `begin; alter table public.state_password_manager disable trigger password_vault_guard; delete from public.state_password_manager where user_id='${userId}'; alter table public.state_password_manager enable trigger password_vault_guard; commit;`,
      ],
      { stdio: "pipe" },
    );
    expect(
      (
        await admin
          .from("user_vaults")
          .update({ legacy_migrated: false })
          .eq("user_id", userId)
      ).error,
    ).toBeNull();
    await restoreBackup(verified);
    await loadPasswords();
    expect(usePasswordStore.getState().entries.emails[0].description).toBe(
      "encrypted change",
    );
    expect(await allRows("crm_notes")).toHaveLength(1005);
    await restoreBackup(verified);
    expect(
      (
        await vaultClient
          .from("user_vaults")
          .select("legacy_migrated")
          .eq("user_id", userId)
          .single()
      ).data.legacy_migrated,
    ).toBe(true);
    const broken = bytes.slice();
    broken[broken.length - 100] ^= 1;
    await expect(verifyBackup(broken)).rejects.toThrow();
    const current = (await listEntities("customer")).find(
      (c) => c.id === customerId,
    )!;
    await saveEntity(
      "customer",
      { ...current.data, firstName: "تغییر جدید" },
      { id: current.id, revision: current.revision },
    );
    await expect(restoreBackup(verified)).rejects.toThrow();
    expect(
      (await listEntities("customer")).find((c) => c.id === customerId)?.data
        .firstName,
    ).toBe("تغییر جدید");
  });
  it("clears all decrypted data on lock and rejects late results", async () => {
    const captured = context(),
      encrypted = await encryptJson({ hello: "secret" }, captured, "record");
    lockVault();
    expect(useCustomers.getState().customers).toHaveLength(0);
    expect(usePasswordStore.getState().entries.emails).toHaveLength(0);
    expect(useVaultSession.getState().key).toBeNull();
    expect(await decryptJson(encrypted, captured, "record")).toEqual({
      hello: "secret",
    }); // local captured key is not reintroduced into a store
    await expect(listEntities("customer")).rejects.toThrow();
  });
});
