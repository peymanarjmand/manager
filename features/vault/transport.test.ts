import { afterEach, expect, it, vi } from "vitest";
import { fetchVaultData } from "./transport";
afterEach(() => vi.unstubAllGlobals());
it("keeps authorization and reads the complete encrypted file without HTTP caching", async () => {
  const mock = vi.fn(
    async (_input: RequestInfo | URL, _options?: RequestInit) =>
      new Response(new Uint8Array([1, 2]), { status: 206 }),
  );
  vi.stubGlobal("fetch", mock);
  await fetchVaultData(
    "https://project.supabase.co/storage/v1/object/lm-vault/user/file.bin",
    { headers: { Authorization: "Bearer test" } },
  );
  const options = mock.mock.calls[0][1] as RequestInit;
  expect(new Headers(options.headers).get("Range")).toBe("bytes=0-");
  expect(new Headers(options.headers).get("Authorization")).toBe("Bearer test");
  expect(options.cache).toBe("no-store");
});
it("does not add byte ranges to database calls or overwrite an explicit range", async () => {
  const mock = vi.fn(
    async (_input: RequestInfo | URL, _options?: RequestInit) =>
      new Response("{}"),
  );
  vi.stubGlobal("fetch", mock);
  await fetchVaultData("https://project.supabase.co/rest/v1/crm_customers", {
    method: "POST",
    body: "{}",
  });
  expect(
    new Headers((mock.mock.calls[0][1] as RequestInit).headers).has("Range"),
  ).toBe(false);
  await fetchVaultData(
    "https://project.supabase.co/storage/v1/object/lm-vault/a/b",
    { headers: { Range: "bytes=2-4" } },
  );
  expect(
    new Headers((mock.mock.calls[1][1] as RequestInit).headers).get("Range"),
  ).toBe("bytes=2-4");
});
