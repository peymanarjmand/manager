import {
  checksum,
  decryptBytes,
  decryptJson,
  encryptBytes,
  encryptJson,
  fromBase64,
  toBase64,
} from "./crypto";
import { allRows, purpose, type CipherRow } from "./repository";
import {
  assertContext,
  authenticateVaultClient,
  context,
  vaultClient,
} from "./session";
import type { AttachmentMetadata, Parent } from "../customers/types";

export interface Attachment extends CipherRow {
  parent_kind: Parent["kind"];
  parent_id: string;
  object_path: string;
  status: "pending" | "ready";
  data: AttachmentMetadata;
}
export const IMAGE_LIMIT = 20 * 1024 * 1024;
export function imageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b))
    return "image/png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function listAttachments(parent: Parent): Promise<Attachment[]> {
  const ctx = context();
  await authenticateVaultClient();
  const rows = await allRows<Attachment>("vault_attachments", {
    parent_kind: parent.kind,
    parent_id: parent.id,
  });
  const result: Attachment[] = [];
  for (const row of rows)
    result.push({
      ...row,
      data: await decryptJson(
        row.payload,
        ctx,
        purpose("vault_attachments", row.id, row.revision),
      ),
    });
  assertContext(ctx);
  return result;
}
export async function uploadImage(
  file: File,
  parent: Parent,
  customerId?: string,
  label = "",
  stableId = crypto.randomUUID(),
): Promise<Attachment> {
  const ctx = context();
  await authenticateVaultClient();
  if (file.size > IMAGE_LIMIT)
    throw new Error("هر تصویر حداکثر ۲۰ مگابایت باشد.");
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = imageType(bytes);
  if (!mime) throw new Error("فقط تصویر JPG، PNG و WebP پذیرفته می‌شود.");
  if (typeof createImageBitmap === "function") {
    try {
      const decoded = await createImageBitmap(file);
      decoded.close();
    } catch {
      throw new Error("این فایل تصویر سالم و قابل بازشدن نیست.");
    }
  }
  const id = stableId,
    path = `${ctx.userId}/${id}.bin`,
    scope = `image/${id}`;
  // Retry a partially completed upload with the same identity, never overwrite
  // an existing encrypted object with different bytes or a new IV.
  const { data: existing, error: lookupError } = await vaultClient
    .from("vault_attachments")
    .select("*")
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (lookupError) throw new Error("بررسی بارگذاری قبلی ناموفق بود.");
  const digest = await checksum(bytes);
  if (existing) {
    const meta = await decryptJson<AttachmentMetadata>(
      existing.payload,
      ctx,
      purpose("vault_attachments", id, existing.revision),
    );
    if (meta.sha256 !== digest)
      throw new Error("شناسهٔ بارگذاری با تصویر دیگری مرتبط است.");
    if (existing.status === "ready") return { ...existing, data: meta };
    // A pending record may have no object. Leave it visible as incomplete and
    // use a fresh identity on explicit retry; the original remains recoverable.
    throw new Error(
      "بارگذاری قبلی کامل نشده است؛ وضعیت آن را بررسی و دوباره انتخاب کنید.",
    );
  }
  const encrypted = await encryptBytes(bytes, ctx, scope);
  const meta: AttachmentMetadata = {
    name: file.name,
    size: file.size,
    mime,
    sha256: digest,
    label,
    imageIv: encrypted.iv,
  };
  const payload = await encryptJson(
    meta,
    ctx,
    purpose("vault_attachments", id, 1),
  );
  assertContext(ctx);
  const { data: inserted, error } = await vaultClient
    .from("vault_attachments")
    .insert({
      id,
      user_id: ctx.userId,
      customer_id: customerId ?? null,
      parent_kind: parent.kind,
      parent_id: parent.id,
      object_path: path,
      payload,
      revision: 1,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error("ثبت تصویر ناموفق بود؛ فایل بارگذاری نشد.");
  const { error: uploadError } = await vaultClient.storage
    .from("lm-vault")
    .upload(
      path,
      new Blob([fromBase64(encrypted.ct)], {
        type: "application/octet-stream",
      }),
      {
        contentType: "application/octet-stream",
        upsert: false,
        cacheControl: "0",
      },
    );
  const attachment = { ...inserted, data: meta } as Attachment;
  // A mobile connection may lose a successful upload response or retry it and
  // return Duplicate. Only the authenticated read-back establishes success.
  try {
    await readImage(attachment);
  } catch (readError) {
    if (uploadError)
      throw new Error(
        "بارگذاری تصویر کامل نشد. اتصال و ظرفیت فضای ذخیره‌سازی را بررسی کنید.",
      );
    throw readError;
  }
  const readyPayload = await encryptJson(
    meta,
    ctx,
    purpose("vault_attachments", id, 2),
  );
  assertContext(ctx);
  const { data: ready, error: readyError } = await vaultClient
    .from("vault_attachments")
    .update({ payload: readyPayload, revision: 2, status: "ready" })
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .eq("revision", 1)
    .select("*")
    .single();
  assertContext(ctx);
  if (readyError)
    throw new Error("تأیید تصویر کامل نشد؛ در فهرست بارگذاری ناقص باقی ماند.");
  return { ...ready, data: meta };
}
export async function readImage(row: Attachment): Promise<Blob> {
  const ctx = context();
  const { data, error } = await vaultClient.storage
    .from("lm-vault")
    .download(row.object_path);
  assertContext(ctx);
  if (error || !data) throw new Error("دریافت تصویر کامل نشد.");
  const bytes = await decryptBytes(
    {
      v: 1,
      keyId: ctx.keyId,
      iv: row.data.imageIv,
      ct: toBase64(new Uint8Array(await data.arrayBuffer())),
    },
    ctx,
    `image/${row.id}`,
  );
  if (
    bytes.length !== row.data.size ||
    (await checksum(bytes)) !== row.data.sha256
  )
    throw new Error("صحت تصویر تأیید نشد.");
  assertContext(ctx);
  return new Blob([bytes], { type: row.data.mime });
}
export async function resumeAttachment(row: Attachment): Promise<void> {
  const ctx = context();
  await authenticateVaultClient();
  await readImage(row);
  const payload = await encryptJson(
    row.data,
    ctx,
    purpose("vault_attachments", row.id, row.revision + 1),
  );
  const { error, data } = await vaultClient
    .from("vault_attachments")
    .update({ payload, revision: row.revision + 1, status: "ready" })
    .eq("user_id", ctx.userId)
    .eq("id", row.id)
    .eq("revision", row.revision)
    .select("id")
    .maybeSingle();
  assertContext(ctx);
  if (error || !data)
    throw new Error("تکمیل بارگذاری تأیید نشد؛ دوباره بررسی کنید.");
}
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
