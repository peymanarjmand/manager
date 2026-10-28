// Versioned, authenticated client-side encryption. No keys or plaintext storage.
export interface EncryptedEnvelope {
  v: 1;
  keyId: string;
  iv: string;
  ct: string;
}
export interface VaultMetadata {
  user_id: string;
  key_id: string;
  salt: string;
  iterations: number;
  password_wrap: EncryptedEnvelope;
  recovery_wrap: EncryptedEnvelope;
  revision: number;
}
export interface VaultContext {
  userId: string;
  keyId: string;
  key: CryptoKey;
  epoch: number;
}
const utf8 = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
export const ITERATIONS = 600_000;
export function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}
export function fromBase64(text: string): Uint8Array {
  if (typeof text !== "string")
    throw new Error("قالب اطلاعات رمز‌شده معتبر نیست.");
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const aad = (owner: string, purpose: string, keyId: string) =>
  utf8.encode(JSON.stringify(["lm-vault", 1, owner, purpose, keyId]));
export function isEnvelope(value: unknown): value is EncryptedEnvelope {
  const v = value as EncryptedEnvelope;
  return (
    !!v &&
    v.v === 1 &&
    typeof v.keyId === "string" &&
    typeof v.iv === "string" &&
    typeof v.ct === "string"
  );
}
export function sameEnvelope(
  a: EncryptedEnvelope,
  b: EncryptedEnvelope,
): boolean {
  return (
    a?.v === b?.v && a?.keyId === b?.keyId && a?.iv === b?.iv && a?.ct === b?.ct
  );
}
async function aes(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
async function passwordKey(
  password: string,
  salt: string,
  iterations: number,
): Promise<CryptoKey> {
  if (iterations !== ITERATIONS || fromBase64(salt).length !== 16)
    throw new Error("نسخهٔ رمزنگاری پشتیبانی نمی‌شود.");
  const seed = await crypto.subtle.importKey(
    "raw",
    utf8.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(salt), iterations, hash: "SHA-256" },
    seed,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function recoveryKey(code: string, owner: string): Promise<CryptoKey> {
  const raw = fromBase64(code.trim().replace(/-/g, "+").replace(/_/g, "/"));
  if (raw.length !== 32) throw new Error("کلید بازیابی معتبر نیست.");
  const seed = await crypto.subtle.importKey("raw", raw, "HKDF", false, [
    "deriveKey",
  ]);
  raw.fill(0);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: utf8.encode(owner),
      info: utf8.encode("lm-vault-recovery-v1"),
    },
    seed,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptBytes(
  bytes: Uint8Array,
  context: Pick<VaultContext, "userId" | "keyId" | "key">,
  purpose: string,
): Promise<EncryptedEnvelope> {
  const iv = random(12);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aad(context.userId, purpose, context.keyId),
      tagLength: 128,
    },
    context.key,
    bytes,
  );
  return {
    v: 1,
    keyId: context.keyId,
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(ciphertext)),
  };
}
export async function decryptBytes(
  payload: EncryptedEnvelope,
  context: Pick<VaultContext, "userId" | "keyId" | "key">,
  purpose: string,
): Promise<Uint8Array> {
  if (
    !isEnvelope(payload) ||
    payload.keyId !== context.keyId ||
    fromBase64(payload.iv).length !== 12
  )
    throw new Error("قالب یا کلید اطلاعات رمز‌شده مطابقت ندارد.");
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: fromBase64(payload.iv),
          additionalData: aad(context.userId, purpose, context.keyId),
          tagLength: 128,
        },
        context.key,
        fromBase64(payload.ct),
      ),
    );
  } catch {
    throw new Error("بازگشایی اطلاعات ناموفق بود؛ هیچ داده‌ای تغییر نکرد.");
  }
}
export const encryptJson = (
  value: unknown,
  context: VaultContext,
  purpose: string,
) => encryptBytes(utf8.encode(JSON.stringify(value)), context, purpose);
export async function decryptJson<T>(
  payload: EncryptedEnvelope,
  context: VaultContext,
  purpose: string,
): Promise<T> {
  return JSON.parse(
    decoder.decode(await decryptBytes(payload, context, purpose)),
  ) as T;
}
export async function createVault(
  userId: string,
  password: string,
): Promise<{ metadata: VaultMetadata; recovery: string; key: CryptoKey }> {
  if (password.length < 12)
    throw new Error("رمز خزانه باید دست‌کم ۱۲ نویسه باشد.");
  const raw = random(32),
    keyId = crypto.randomUUID(),
    salt = toBase64(random(16));
  const recovery = toBase64(random(32))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  try {
    const pKey = await passwordKey(password, salt, ITERATIONS);
    const rKey = await recoveryKey(recovery, userId);
    const password_wrap = await encryptBytes(
      raw,
      { userId, keyId, key: pKey },
      "password-wrap",
    );
    const recovery_wrap = await encryptBytes(
      raw,
      { userId, keyId, key: rKey },
      "recovery-wrap",
    );
    return {
      metadata: {
        user_id: userId,
        key_id: keyId,
        salt,
        iterations: ITERATIONS,
        password_wrap,
        recovery_wrap,
        revision: 1,
      },
      recovery,
      key: await aes(raw),
    };
  } finally {
    raw.fill(0);
  }
}
async function unwrapRaw(
  meta: VaultMetadata,
  secret: string,
  recovery: boolean,
): Promise<Uint8Array> {
  const key = recovery
    ? await recoveryKey(secret, meta.user_id)
    : await passwordKey(secret, meta.salt, meta.iterations);
  const raw = await decryptBytes(
    recovery ? meta.recovery_wrap : meta.password_wrap,
    { userId: meta.user_id, keyId: meta.key_id, key },
    recovery ? "recovery-wrap" : "password-wrap",
  );
  if (raw.length !== 32) throw new Error("کلید خزانه معتبر نیست.");
  return raw;
}
export async function unlockVault(
  meta: VaultMetadata,
  secret: string,
  recovery = false,
): Promise<CryptoKey> {
  const raw = await unwrapRaw(meta, secret, recovery);
  try {
    return await aes(raw);
  } finally {
    raw.fill(0);
  }
}
export async function rewrapPassword(
  meta: VaultMetadata,
  secret: string,
  newPassword: string,
  recovery = false,
): Promise<VaultMetadata> {
  if (newPassword.length < 12)
    throw new Error("رمز جدید باید دست‌کم ۱۲ نویسه باشد.");
  const raw = await unwrapRaw(meta, secret, recovery),
    salt = toBase64(random(16));
  try {
    const key = await passwordKey(newPassword, salt, ITERATIONS);
    return {
      ...meta,
      salt,
      iterations: ITERATIONS,
      revision: meta.revision + 1,
      password_wrap: await encryptBytes(
        raw,
        { userId: meta.user_id, keyId: meta.key_id, key },
        "password-wrap",
      ),
    };
  } finally {
    raw.fill(0);
  }
}
export async function checksum(bytes: Uint8Array): Promise<string> {
  return toBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
