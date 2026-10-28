import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import {
  checksum,
  decryptBytes,
  decryptJson,
  encryptJson,
  isEnvelope,
  sameEnvelope,
  toBase64,
  type EncryptedEnvelope,
  type VaultMetadata,
  type VaultContext,
} from "./crypto";
import { allRows, purpose, type CipherRow } from "./repository";
import {
  assertContext,
  authenticateVaultClient,
  context,
  useVaultSession,
  vaultClient,
} from "./session";
import { type Attachment } from "./attachments";
import type { AttachmentMetadata } from "../customers/types";

const TABLE_NAMES = [
  "crm_customers",
  "crm_projects",
  "crm_records",
  "crm_ledger_entries",
  "crm_notes",
  "vault_attachments",
] as const;
export interface PasswordCipher {
  id: string;
  user_id: string;
  value: EncryptedEnvelope;
  revision: number;
  encryption_version: 1;
  updated_at?: string;
}
interface Manifest {
  version: 1;
  userId: string;
  keyId: string;
  createdAt: string;
  tables: Record<string, CipherRow[]>;
  links: object[];
  revisions: {
    user_id: string;
    entity_table: string;
    entity_id: string;
    revision: number;
    payload: EncryptedEnvelope;
    archived_at: string | null;
    recorded_at: string;
  }[];
  password: PasswordCipher | null;
  files: Record<string, string>;
  legacySource?: unknown;
}
interface Header {
  format: "lm-vault-backup";
  version: 1;
  metadata: VaultMetadata;
  payload: EncryptedEnvelope;
}
export interface VerifiedBackup {
  manifest: Manifest;
  files: Record<string, Uint8Array>;
  metadata: VaultMetadata;
}

async function pageComposite<T>(table: string, order: string[]): Promise<T[]> {
  const ctx = context(),
    rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    let q = vaultClient.from(table).select("*").eq("user_id", ctx.userId);
    order.forEach((field) => {
      q = q.order(field);
    });
    const { data, error } = await q.range(offset, offset + 499);
    assertContext(ctx);
    if (error) throw new Error("بکاپ کامل دریافت نشد.");
    rows.push(...(data as T[]));
    if (data.length < 500) return rows;
  }
}
export async function buildBackup(
  passwordOverride?: PasswordCipher,
  legacySource?: unknown,
): Promise<Uint8Array> {
  const ctx = context();
  await authenticateVaultClient();
  const tables: Manifest["tables"] = {};
  for (const table of TABLE_NAMES)
    tables[table] = await allRows<CipherRow>(table);
  const links = await pageComposite<object>("crm_record_projects", [
    "record_id",
    "project_id",
  ]);
  const revisions = await pageComposite<Manifest["revisions"][number]>(
    "vault_revisions",
    ["entity_table", "entity_id", "revision"],
  );
  const { data: source, error } = await vaultClient
    .from("state_password_manager")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", "lifeManagerPasswords")
    .maybeSingle();
  if (error) throw new Error("خواندن مدیر رمز برای بکاپ ناموفق بود.");
  if (!passwordOverride && source && source.encryption_version !== 1)
    throw new Error("ابتدا مهاجرت امن مدیر رمز را کامل کنید.");
  const manifest: Manifest = {
    version: 1,
    userId: ctx.userId,
    keyId: ctx.keyId,
    createdAt: new Date().toISOString(),
    tables,
    links,
    revisions,
    password: passwordOverride ?? source,
    files: {},
    ...(legacySource ? { legacySource } : {}),
  };
  const files: Record<string, Uint8Array> = {};
  for (const row of tables.vault_attachments as Attachment[]) {
    if (row.status !== "ready") continue;
    const { data, error: downloadError } = await vaultClient.storage
      .from("lm-vault")
      .download(row.object_path);
    assertContext(ctx);
    if (downloadError || !data)
      throw new Error("دریافت یکی از تصاویر بکاپ کامل نشد.");
    const bytes = new Uint8Array(await data.arrayBuffer());
    files[`images/${row.id}.bin`] = bytes;
    manifest.files[row.id] = await checksum(bytes);
  }
  // Never certify a backup if concurrent editing changed its source rows.
  for (const table of TABLE_NAMES) {
    const current = await allRows<CipherRow>(table);
    if (JSON.stringify(current) !== JSON.stringify(tables[table]))
      throw new Error("اطلاعات هنگام بکاپ تغییر کرد؛ دوباره بکاپ بگیرید.");
  }
  const metadata = useVaultSession.getState().metadata!;
  const header: Header = {
    format: "lm-vault-backup",
    version: 1,
    metadata,
    payload: await encryptJson(manifest, ctx, "backup-manifest"),
  };
  files["manifest.json"] = strToU8(JSON.stringify(header));
  assertContext(ctx);
  const bytes = zipSync(files, { level: 0 });
  await verifyBackup(bytes);
  return bytes;
}
export function backupHeader(bytes: Uint8Array): VaultMetadata {
  const entries = unzipSync(bytes, {
    filter: (f) =>
      f.name === "manifest.json" && f.originalSize < 200 * 1024 * 1024,
  });
  if (!entries["manifest.json"]) throw new Error("فایل بکاپ معتبر نیست.");
  const header = JSON.parse(strFromU8(entries["manifest.json"])) as Header;
  if (
    header.format !== "lm-vault-backup" ||
    header.version !== 1 ||
    !isEnvelope(header.payload)
  )
    throw new Error("نسخهٔ بکاپ پشتیبانی نمی‌شود.");
  return header.metadata;
}
export async function verifyBackup(
  bytes: Uint8Array,
  isolatedContext?: VaultContext,
): Promise<VerifiedBackup> {
  const ctx = isolatedContext ?? context(),
    files = unzipSync(bytes),
    header = JSON.parse(strFromU8(files["manifest.json"])) as Header;
  if (
    header.format !== "lm-vault-backup" ||
    header.version !== 1 ||
    header.metadata.user_id !== ctx.userId ||
    header.metadata.key_id !== ctx.keyId
  )
    throw new Error("بکاپ متعلق به این حساب و خزانه نیست.");
  const manifest = await decryptJson<Manifest>(
    header.payload,
    ctx,
    "backup-manifest",
  );
  if (
    manifest.version !== 1 ||
    manifest.userId !== ctx.userId ||
    manifest.keyId !== ctx.keyId ||
    Object.keys(manifest.tables).some(
      (t) => !TABLE_NAMES.includes(t as (typeof TABLE_NAMES)[number]),
    )
  )
    throw new Error("ساختار بکاپ معتبر نیست.");
  for (const table of TABLE_NAMES) {
    if (!Array.isArray(manifest.tables[table]))
      throw new Error("بکاپ ناقص است.");
    for (const row of manifest.tables[table]) {
      if (row.user_id !== ctx.userId)
        throw new Error("مالک رکورد بکاپ مطابقت ندارد.");
      await decryptJson(row.payload, ctx, purpose(table, row.id, row.revision));
    }
  }
  for (const row of manifest.revisions) {
    if (row.user_id !== ctx.userId)
      throw new Error("مالک تاریخچه مطابقت ندارد.");
    await decryptJson(
      row.payload,
      ctx,
      purpose(row.entity_table, row.entity_id, row.revision),
    );
  }
  if (manifest.password) {
    if (
      manifest.password.user_id !== ctx.userId ||
      manifest.password.encryption_version !== 1
    )
      throw new Error("بکاپ مدیر رمز معتبر نیست.");
    await decryptJson(
      manifest.password.value,
      ctx,
      purpose(
        "state_password_manager",
        manifest.password.id,
        manifest.password.revision,
      ),
    );
  }
  for (const row of manifest.tables.vault_attachments as Attachment[]) {
    if (row.status !== "ready") continue;
    const encrypted = files[`images/${row.id}.bin`];
    if (!encrypted || (await checksum(encrypted)) !== manifest.files[row.id])
      throw new Error("یکی از تصاویر بکاپ ناقص است.");
    const meta = await decryptJson<AttachmentMetadata>(
      row.payload,
      ctx,
      purpose("vault_attachments", row.id, row.revision),
    );
    const plain = await decryptBytes(
      { v: 1, keyId: ctx.keyId, iv: meta.imageIv, ct: toBase64(encrypted) },
      ctx,
      `image/${row.id}`,
    );
    if ((await checksum(plain)) !== meta.sha256 || plain.length !== meta.size)
      throw new Error("بازیابی آزمایشی تصویر ناموفق بود.");
  }
  if (!isolatedContext) assertContext(ctx);
  return { manifest, files, metadata: header.metadata };
}
export async function restoreBackup(verified: VerifiedBackup): Promise<void> {
  const ctx = context();
  await authenticateVaultClient();
  if (
    verified.manifest.userId !== ctx.userId ||
    verified.manifest.keyId !== ctx.keyId
  )
    throw new Error("خزانه تغییر کرده است.");
  for (const table of TABLE_NAMES)
    for (const row of verified.manifest.tables[table]) {
      assertContext(ctx);
      const { data: current, error: readError } = await vaultClient
        .from(table)
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("id", row.id)
        .maybeSingle();
      if (readError) throw new Error("بررسی بازیابی کامل نشد.");
      if (current) {
        if (
          current.revision !== row.revision ||
          !sameEnvelope(current.payload, row.payload)
        )
          throw new Error(
            "تعارض با رکورد موجود؛ هیچ رکورد موجودی بازنویسی نشد. بازیابی موارد جدید قابل ادامه است.",
          );
      } else {
        if (
          table === "vault_attachments" &&
          (row as Attachment).status === "ready"
        ) {
          const attachment = row as Attachment,
            blob = verified.files[`images/${row.id}.bin`];
          const { data: old } = await vaultClient.storage
            .from("lm-vault")
            .download(attachment.object_path);
          if (old) {
            if (
              (await checksum(new Uint8Array(await old.arrayBuffer()))) !==
              (await checksum(blob))
            )
              throw new Error("تعارض تصویر موجود.");
          } else {
            const { error } = await vaultClient.storage
              .from("lm-vault")
              .upload(
                attachment.object_path,
                new Blob([blob], { type: "application/octet-stream" }),
                {
                  contentType: "application/octet-stream",
                  upsert: false,
                  cacheControl: "0",
                },
              );
            if (error) throw new Error("بازیابی تصویر کامل نشد.");
          }
        }
        const { error } = await vaultClient.from(table).insert(row);
        if (error)
          throw new Error(
            "بازیابی کامل نشد؛ رکوردهای قبلی دست‌نخورده‌اند و اجرای دوباره ممکن است.",
          );
      }
    }
  for (const link of verified.manifest.links) {
    const { error } = await vaultClient
      .from("crm_record_projects")
      .upsert(link, {
        onConflict: "user_id,record_id,project_id",
        ignoreDuplicates: true,
      });
    if (error) throw new Error("بازیابی ارتباط پروژه‌ها کامل نشد.");
  }
  for (const row of verified.manifest.revisions) {
    const { error } = await vaultClient.rpc("vault_restore_revision", {
      p_row: row,
    });
    if (error) throw new Error("بازیابی تاریخچه کامل نشد.");
  }
  const password = verified.manifest.password;
  if (password) {
    const { data: current, error } = await vaultClient
      .from("state_password_manager")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("id", password.id)
      .maybeSingle();
    if (error) throw new Error("بررسی مدیر رمز کامل نشد.");
    if (
      current &&
      (current.revision !== password.revision ||
        !sameEnvelope(current.value, password.value))
    )
      throw new Error("مدیر رمز موجود متفاوت است؛ بازنویسی نشد.");
    if (!current) {
      const data = await decryptJson(
        password.value,
        ctx,
        purpose("state_password_manager", password.id, password.revision),
      );
      // Preserve the version bound into the authenticated payload and history.
      void data;
      const { error: insertError } = await vaultClient
        .from("state_password_manager")
        .insert(password);
      if (insertError) throw new Error("بازیابی مدیر رمز کامل نشد.");
    }
    const { error: markerError } = await vaultClient.rpc(
      "vault_finish_password_migration",
      {
        p_revision: password.revision,
        p_payload: password.value,
        p_backup_sha256: await checksum(
          strToU8(JSON.stringify(verified.manifest)),
        ),
      },
    );
    if (markerError) throw new Error("تأیید بازیابی مدیر رمز کامل نشد.");
  }
  assertContext(ctx);
}
