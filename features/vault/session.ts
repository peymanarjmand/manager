import { create } from "zustand";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabase } from "../../lib/supabase";
import {
  createVault,
  unlockVault,
  rewrapPassword,
  type VaultContext,
  type VaultMetadata,
} from "./crypto";
import { fetchVaultData } from "./transport";

// Shares the authenticated session but deliberately bypasses HTTP caches. Never
// reuse the application's durable mutation outbox for vault data.
export const vaultClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: "lm-vault-memory-session",
        },
        global: { fetch: fetchVaultData },
      })
    : supabase;

type VaultStatus = "loading" | "missing" | "locked" | "open" | "error";
interface VaultState {
  userId: string | null;
  status: VaultStatus;
  metadata: VaultMetadata | null;
  key: CryptoKey | null;
  epoch: number;
  error: string | null;
}
export const useVaultSession = create<VaultState>(() => ({
  userId: null,
  status: "loading",
  metadata: null,
  key: null,
  epoch: 0,
  error: null,
}));
const lockedListeners = new Set<() => void>();
export function onVaultLock(listener: () => void): () => void {
  lockedListeners.add(listener);
  return () => {
    lockedListeners.delete(listener);
  };
}
export function requireOnline(): void {
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    throw new Error(
      "برای استفاده از خزانه به اینترنت متصل شوید؛ چیزی ذخیره نشد.",
    );
}
export function lockVault(clearAccount = false): void {
  useVaultSession.setState((s) => ({
    key: null,
    epoch: s.epoch + 1,
    status: clearAccount ? "loading" : s.metadata ? "locked" : s.status,
    ...(clearAccount ? { userId: null, metadata: null, error: null } : {}),
  }));
  lockedListeners.forEach((fn) => fn());
}
export async function authenticateVaultClient(): Promise<string> {
  requireOnline();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new Error("برای استفاده از خزانه دوباره وارد حساب شوید.");
  await vaultClient.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  return data.session.user.id;
}
export async function initializeVault(
  userId: string,
  force = false,
): Promise<void> {
  const old = useVaultSession.getState();
  if (
    !force &&
    old.userId === userId &&
    old.status !== "error" &&
    old.status !== "loading"
  )
    return;
  lockVault(true);
  useVaultSession.setState({ userId, status: "loading" });
  const epoch = useVaultSession.getState().epoch;
  try {
    if ((await authenticateVaultClient()) !== userId)
      throw new Error("حساب کاربری تغییر کرده است.");
    const { data, error } = await vaultClient
      .from("user_vaults")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (useVaultSession.getState().epoch !== epoch) return;
    if (error)
      throw new Error(
        error.code === "42P01" || error.code === "PGRST205"
          ? "ساختار خزانه هنوز روی سرور فعال نشده است."
          : "دریافت خزانه ناموفق بود؛ دوباره تلاش کنید.",
      );
    useVaultSession.setState({
      metadata: data as VaultMetadata | null,
      status: data ? "locked" : "missing",
      error: null,
    });
  } catch (error) {
    if (useVaultSession.getState().epoch === epoch)
      useVaultSession.setState({
        status: "error",
        error: (error as Error).message,
      });
  }
}
export function context(): VaultContext {
  requireOnline();
  const state = useVaultSession.getState();
  if (state.status !== "open" || !state.key || !state.metadata || !state.userId)
    throw new Error("خزانه قفل است.");
  return {
    key: state.key,
    keyId: state.metadata.key_id,
    userId: state.userId,
    epoch: state.epoch,
  };
}
export function assertContext(captured: VaultContext): void {
  const current = useVaultSession.getState();
  if (
    current.status !== "open" ||
    current.epoch !== captured.epoch ||
    current.userId !== captured.userId
  )
    throw new Error("خزانه قفل یا حساب تغییر کرده است.");
}
export async function acceptCreatedVault(
  result: Awaited<ReturnType<typeof createVault>>,
): Promise<void> {
  const state = useVaultSession.getState(),
    epoch = state.epoch;
  if (state.status !== "missing" || state.userId !== result.metadata.user_id)
    throw new Error("وضعیت خزانه تغییر کرده است.");
  await authenticateVaultClient();
  const m = result.metadata;
  const { error } = await vaultClient
    .from("user_vaults")
    .insert({
      user_id: m.user_id,
      key_id: m.key_id,
      salt: m.salt,
      iterations: m.iterations,
      password_wrap: m.password_wrap,
      recovery_wrap: m.recovery_wrap,
      revision: m.revision,
    });
  if (error)
    throw new Error(
      "ذخیرهٔ خزانه ناموفق بود. دوباره بارگذاری کنید؛ خزانهٔ موجود بازنویسی نشد.",
    );
  if (useVaultSession.getState().epoch !== epoch) return;
  useVaultSession.setState({
    metadata: result.metadata,
    key: result.key,
    status: "open",
    error: null,
  });
}
export async function openVault(
  secret: string,
  recovery = false,
): Promise<void> {
  await authenticateVaultClient();
  const state = useVaultSession.getState(),
    epoch = state.epoch;
  if (!state.metadata) throw new Error("خزانه‌ای برای این حساب پیدا نشد.");
  const key = await unlockVault(state.metadata, secret, recovery);
  if (useVaultSession.getState().epoch !== epoch)
    throw new Error("حساب تغییر کرده است.");
  useVaultSession.setState({ key, status: "open", error: null });
}
export async function changeVaultPassword(
  secret: string,
  next: string,
  recovery = false,
): Promise<void> {
  const captured = context(),
    meta = useVaultSession.getState().metadata!;
  const updated = await rewrapPassword(meta, secret, next, recovery);
  assertContext(captured);
  const { data, error } = await vaultClient
    .from("user_vaults")
    .update({
      salt: updated.salt,
      password_wrap: updated.password_wrap,
      revision: updated.revision,
    })
    .eq("user_id", captured.userId)
    .eq("revision", meta.revision)
    .select("*")
    .maybeSingle();
  assertContext(captured);
  if (error || !data)
    throw new Error("رمز تغییر نکرد؛ وضعیت خزانه را دوباره دریافت کنید.");
  useVaultSession.setState({ metadata: data as VaultMetadata });
}

let timerInstalled = false;
export function installVaultLock(): void {
  if (timerInstalled || typeof window === "undefined") return;
  timerInstalled = true;
  let lastActivity = Date.now();
  const check = () => {
    if (
      useVaultSession.getState().status === "open" &&
      Date.now() - lastActivity >= 600_000
    )
      lockVault();
  };
  const activity = () => {
    check();
    lastActivity = Date.now();
  };
  ["pointerdown", "keydown", "touchstart"].forEach((event) =>
    window.addEventListener(event, activity, { passive: true }),
  );
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  window.addEventListener("pagehide", () => lockVault());
  window.setInterval(check, 15_000);
  useVaultSession.subscribe((state) => {
    if (state.status === "open") lastActivity = Date.now();
  });
}
