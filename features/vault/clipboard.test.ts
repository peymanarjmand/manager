import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { copyValue } from "./clipboard";
import { lockVault } from "./session";
vi.mock("../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
let clipboard = "";
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("navigator", {
    onLine: true,
    clipboard: {
      writeText: vi.fn(async (v: string) => {
        clipboard = v;
      }),
      readText: vi.fn(async () => clipboard),
    },
  });
});
afterEach(() => {
  lockVault();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("clears a copied secret after 25 seconds", async () => {
  await copyValue("secret", true);
  await vi.advanceTimersByTimeAsync(24999);
  expect(clipboard).toBe("secret");
  await vi.advanceTimersByTimeAsync(1);
  expect(clipboard).toBe("");
});
it("preserves newer clipboard content copied in another application", async () => {
  await copyValue("secret", true);
  clipboard = "new user content";
  await vi.advanceTimersByTimeAsync(25000);
  expect(clipboard).toBe("new user content");
});
it("drops pending confidential clipboard content on lock", async () => {
  await copyValue("secret", true);
  lockVault();
  await Promise.resolve();
  expect(clipboard).toBe("");
});
