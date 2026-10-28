import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { localConfig as cfg } from "../local-config";
test("authenticated encrypted binary download works in a real browser", async ({
  page,
}) => {
  const admin = createClient(cfg.API_URL, cfg.SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    }),
    email = `transport-${crypto.randomUUID()}@example.test`,
    password = "local-transport-test-password";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  const user = createClient(cfg.API_URL, cfg.ANON_KEY, {
      auth: { persistSession: false },
    }),
    login = await user.auth.signInWithPassword({ email, password });
  expect(login.error).toBeNull();
  const path = `${created.data.user!.id}/${crypto.randomUUID()}.bin`,
    bytes = crypto.getRandomValues(new Uint8Array(32));
  expect(
    (
      await user.storage
        .from("lm-vault")
        .upload(path, new Blob([bytes], { type: "application/octet-stream" }), {
          cacheControl: "0",
          upsert: false,
          contentType: "application/octet-stream",
        })
    ).error,
  ).toBeNull();
  await page.goto("/");
  const result = await page.evaluate(
    async ({ url, apikey, token }) => {
      try {
        const response = await fetch(url, {
          headers: {
            apikey,
            Authorization: `Bearer ${token}`,
            Range: "bytes=0-",
          },
          cache: "no-store",
        });
        return {
          status: response.status,
          bytes: (await response.arrayBuffer()).byteLength,
        };
      } catch (error) {
        return { error: String(error) };
      }
    },
    {
      url: `http://localhost:54321/storage/v1/object/lm-vault/${path}`,
      apikey: cfg.ANON_KEY,
      token: login.data.session!.access_token,
    },
  );
  expect(result).toEqual({ status: 206, bytes: 32 });
});
