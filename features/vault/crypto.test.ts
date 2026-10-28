import { beforeAll, describe, expect, it } from "vitest";
import {
  createVault,
  decryptBytes,
  decryptJson,
  encryptBytes,
  encryptJson,
  fromBase64,
  rewrapPassword,
  toBase64,
  unlockVault,
  type VaultContext,
} from "./crypto";
import { imageType, IMAGE_LIMIT } from "./attachments";
describe("vault authenticated encryption and recovery", () => {
  let created: Awaited<ReturnType<typeof createVault>>, ctx: VaultContext;
  beforeAll(async () => {
    created = await createVault(crypto.randomUUID(), "strong-vault-passphrase");
    ctx = {
      userId: created.metadata.user_id,
      keyId: created.metadata.key_id,
      key: created.key,
      epoch: 1,
    };
  });
  it("uses fresh IVs and preserves secret bytes without normalization", async () => {
    const value = { password: "  ۱۲۳۴ ä:$\n ", money: "9007199254740993" },
      a = await encryptJson(value, ctx, "record/a/1"),
      b = await encryptJson(value, ctx, "record/a/1");
    expect(a.iv).not.toBe(b.iv);
    expect(await decryptJson(a, ctx, "record/a/1")).toEqual(value);
    expect(JSON.stringify(a)).not.toContain("money");
  });
  it("rejects wrong password and recovery key without returning an empty object", async () => {
    await expect(unlockVault(created.metadata, "wrong")).rejects.toThrow();
    await expect(
      unlockVault(created.metadata, "A".repeat(43), true),
    ).rejects.toThrow();
    const key = await unlockVault(created.metadata, created.recovery, true),
      cipher = await encryptJson({ ok: true }, ctx, "a");
    expect(await decryptJson(cipher, { ...ctx, key }, "a")).toEqual({
      ok: true,
    });
  });
  it("authenticates owner, record, revision and image bytes", async () => {
    const cipher = await encryptBytes(
      new Uint8Array([1, 2, 3]),
      ctx,
      "image/1",
    );
    await expect(
      decryptBytes(cipher, { ...ctx, userId: crypto.randomUUID() }, "image/1"),
    ).rejects.toThrow();
    await expect(decryptBytes(cipher, ctx, "image/2")).rejects.toThrow();
    const modified = fromBase64(cipher.ct);
    modified[0] ^= 1;
    await expect(
      decryptBytes({ ...cipher, ct: toBase64(modified) }, ctx, "image/1"),
    ).rejects.toThrow();
  });
  it("changes only the password wrap and keeps the recovery key/data valid", async () => {
    const next = await rewrapPassword(
      created.metadata,
      created.recovery,
      "a-new-long-passphrase",
      true,
    );
    await expect(
      unlockVault(next, "strong-vault-passphrase"),
    ).rejects.toThrow();
    await expect(
      unlockVault(next, "a-new-long-passphrase"),
    ).resolves.toBeTruthy();
    await expect(
      unlockVault(next, created.recovery, true),
    ).resolves.toBeTruthy();
    expect(next.key_id).toBe(created.metadata.key_id);
    expect(next.recovery_wrap).toEqual(created.metadata.recovery_wrap);
  });
  it("accepts only supported image signatures and preserves the 20 MiB limit", () => {
    expect(imageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
      "image/png",
    );
    expect(imageType(new TextEncoder().encode("<svg/>"))).toBeNull();
    expect(IMAGE_LIMIT).toBe(20971520);
  });
});
