import {
  assertContext,
  authenticateVaultClient,
  context,
  vaultClient,
} from "./session";
import {
  checksum,
  decryptJson,
  encryptJson,
  sameEnvelope,
  type EncryptedEnvelope,
} from "./crypto";
import { buildBackup, type PasswordCipher } from "./backup";
import {
  listAttachments,
  uploadImage,
  readImage,
  resumeAttachment,
} from "./attachments";
import { parseEntries, emptyEntries } from "../password-manager/store";
import { purpose } from "./repository";
import type { AnyPasswordEntry } from "../password-manager/types";

export interface MigrationPrepared {
  backup: Uint8Array;
  payload: EncryptedEnvelope;
  revision: number;
  count: number;
  imageCount: number;
}
export async function migrationNeeded(): Promise<boolean> {
  const ctx = context();
  await authenticateVaultClient();
  const { data, error } = await vaultClient
    .from("user_vaults")
    .select("legacy_migrated")
    .eq("user_id", ctx.userId)
    .single();
  assertContext(ctx);
  if (error) throw new Error("وضعیت مهاجرت دریافت نشد.");
  return !data.legacy_migrated;
}
async function oldImage(ref: string): Promise<Blob> {
  if (ref.startsWith("lmimg:")) {
    const { data, error } = await vaultClient.storage
      .from("lm-images")
      .download(ref.slice(6));
    if (error || !data)
      throw new Error("تصویر قدیمی دریافت نشد؛ اصل داده تغییر نکرد.");
    return data;
  }
  if (/^data:image\/(png|jpeg|webp);base64,/.test(ref))
    return (await fetch(ref)).blob();
  throw new Error(
    "قالب تصویر قدیمی پشتیبانی نمی‌شود؛ برای حفظ داده، مهاجرت متوقف شد.",
  );
}
export async function prepareMigration(): Promise<MigrationPrepared> {
  const ctx = context();
  await authenticateVaultClient();
  const { data: source, error } = await vaultClient
    .from("state_password_manager")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", "lifeManagerPasswords")
    .maybeSingle();
  if (error) throw new Error("دریافت رمزهای فعلی ناموفق بود.");
  if (source?.encryption_version === 1)
    throw new Error("مهاجرت قبلاً انجام شده است؛ دوباره بارگذاری کنید.");
  const entries = source
    ? structuredClone(parseEntries(source.value))
    : emptyEntries();
  let count = 0,
    imageCount = 0;
  for (const list of Object.values(entries))
    for (const entry of list as AnyPasswordEntry[]) {
      count++;
      if (!entry.image) continue;
      const original = await oldImage(entry.image),
        originalHash = await checksum(
          new Uint8Array(await original.arrayBuffer()),
        );
      const previous = await listAttachments({
        kind: "password",
        id: entry.id,
      });
      let copy = previous.find(
        (a) =>
          a.status === "ready" &&
          a.data.label === "تصویر منتقل‌شده" &&
          a.data.sha256 === originalHash,
      );
      if (!copy) {
        const pending = previous.find(
          (a) =>
            a.status === "pending" &&
            a.data.label === "تصویر منتقل‌شده" &&
            a.data.sha256 === originalHash,
        );
        if (pending) {
          try {
            await resumeAttachment(pending);
            copy = (
              await listAttachments({ kind: "password", id: entry.id })
            ).find((a) => a.id === pending.id && a.status === "ready");
          } catch {
            /* Original stays untouched; an incomplete staging row is retained. */
          }
        }
      }
      if (!copy)
        copy = await uploadImage(
          new File(
            [original],
            `legacy-${entry.id}.${original.type.split("/")[1] || "jpg"}`,
            { type: original.type },
          ),
          { kind: "password", id: entry.id },
          undefined,
          "تصویر منتقل‌شده",
        );
      const roundTrip = await readImage(copy);
      if (
        (await checksum(new Uint8Array(await roundTrip.arrayBuffer()))) !==
        originalHash
      )
        throw new Error("تطبیق تصویر منتقل‌شده ناموفق بود.");
      entry.image = `vaultimg:${copy.id}`;
      imageCount++;
    }
  const revision = source?.revision ?? 0,
    value = { state: { entries }, version: 1 };
  const payload = await encryptJson(
    value,
    ctx,
    purpose("state_password_manager", "lifeManagerPasswords", revision + 1),
  );
  if (
    JSON.stringify(
      await decryptJson(
        payload,
        ctx,
        purpose("state_password_manager", "lifeManagerPasswords", revision + 1),
      ),
    ) !== JSON.stringify(value)
  )
    throw new Error("تطبیق داده‌های مهاجرت ناموفق بود.");
  const override: PasswordCipher = {
    id: "lifeManagerPasswords",
    user_id: ctx.userId,
    encryption_version: 1,
    revision: revision + 1,
    value: payload,
  };
  const backup = await buildBackup(override, source?.value);
  assertContext(ctx);
  return { backup, payload, revision, count, imageCount };
}
export async function finishMigration(
  prepared: MigrationPrepared,
): Promise<void> {
  const ctx = context();
  await authenticateVaultClient();
  const { error } = await vaultClient.rpc("vault_finish_password_migration", {
    p_revision: prepared.revision,
    p_payload: prepared.payload,
    p_backup_sha256: await checksum(prepared.backup),
  });
  assertContext(ctx);
  if (error)
    throw new Error(
      "انتقال نهایی تأیید نشد یا دادهٔ قدیمی تغییر کرده است؛ اصل داده بازنویسی نشد. دوباره بررسی کنید.",
    );
  const { data: current, error: readError } = await vaultClient
    .from("state_password_manager")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", "lifeManagerPasswords")
    .single();
  assertContext(ctx);
  if (
    readError ||
    !sameEnvelope(current.value, prepared.payload) ||
    current.encryption_version !== 1
  )
    throw new Error(
      "تأیید نهایی کامل نشد؛ بکاپ را نگه دارید و دوباره بارگذاری کنید.",
    );
  await decryptJson(
    current.value,
    ctx,
    purpose("state_password_manager", current.id, current.revision),
  );
  // Shared legacy object ownership is ambiguous: retain the originals.
}
