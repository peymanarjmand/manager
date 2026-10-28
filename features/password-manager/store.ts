import { create } from "zustand";
import type { AnyPasswordEntry, PasswordCategory } from "./types";
import {
  assertContext,
  authenticateVaultClient,
  context,
  onVaultLock,
  vaultClient,
} from "../vault/session";
import { decryptJson, encryptJson } from "../vault/crypto";
import { purpose } from "../vault/repository";
export type Entries = Record<PasswordCategory, AnyPasswordEntry[]>;
export const emptyEntries = (): Entries => ({
  emails: [],
  banks: [],
  accounts: [],
  wallets: [],
  exchanges: [],
});
interface PasswordState {
  entries: Entries;
  revision: number;
  loaded: boolean;
  error: string | null;
}
export const usePasswordStore = create<PasswordState>(() => ({
  entries: emptyEntries(),
  revision: 0,
  loaded: false,
  error: null,
}));
onVaultLock(() =>
  usePasswordStore.setState({
    entries: emptyEntries(),
    revision: 0,
    loaded: false,
    error: null,
  }),
);
export function parseEntries(value: unknown): Entries {
  const entries = (value as { state?: { entries?: Entries } })?.state?.entries;
  if (
    !entries ||
    Object.keys(emptyEntries()).some(
      (k) => !Array.isArray(entries[k as PasswordCategory]),
    )
  )
    throw new Error("ساختار مدیر رمز معتبر نیست؛ دادهٔ قبلی بازنویسی نشد.");
  return entries;
}
export async function loadPasswords(): Promise<void> {
  const ctx = context();
  await authenticateVaultClient();
  try {
    const { data, error } = await vaultClient
      .from("state_password_manager")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("id", "lifeManagerPasswords")
      .single();
    if (error || data.encryption_version !== 1)
      throw new Error("ابتدا مهاجرت امن مدیر رمز را کامل کنید.");
    const entries = parseEntries(
      await decryptJson(
        data.value,
        ctx,
        purpose("state_password_manager", data.id, data.revision),
      ),
    );
    assertContext(ctx);
    usePasswordStore.setState({
      entries,
      revision: data.revision,
      loaded: true,
      error: null,
    });
  } catch (error) {
    assertContext(ctx);
    usePasswordStore.setState({
      loaded: false,
      error: (error as Error).message,
    });
    throw error;
  }
}
export async function savePassword(
  category: PasswordCategory,
  entry: AnyPasswordEntry,
): Promise<void> {
  const ctx = context(),
    state = usePasswordStore.getState();
  if (!state.loaded) throw new Error("اطلاعات مدیر رمز کامل دریافت نشده است.");
  await authenticateVaultClient();
  const list = [...state.entries[category]],
    index = list.findIndex((e) => e.id === entry.id);
  if (index < 0) list.push(entry);
  else list[index] = entry;
  const entries = { ...state.entries, [category]: list },
    next = state.revision + 1;
  const value = await encryptJson(
    { state: { entries }, version: 1 },
    ctx,
    purpose("state_password_manager", "lifeManagerPasswords", next),
  );
  const { data, error } = await vaultClient
    .from("state_password_manager")
    .update({ value, encryption_version: 1 })
    .eq("user_id", ctx.userId)
    .eq("id", "lifeManagerPasswords")
    .eq("revision", state.revision)
    .select("*")
    .maybeSingle();
  assertContext(ctx);
  if (error || !data) {
    const { data: current } = await vaultClient
      .from("state_password_manager")
      .select("*")
      .eq("user_id", ctx.userId)
      .eq("id", "lifeManagerPasswords")
      .maybeSingle();
    assertContext(ctx);
    if (
      !current ||
      current.revision !== next ||
      JSON.stringify(
        await decryptJson(
          current.value,
          ctx,
          purpose("state_password_manager", current.id, current.revision),
        ),
      ) !== JSON.stringify({ state: { entries }, version: 1 })
    )
      throw new Error(
        "ذخیره تأیید نشد یا داده روی دستگاه دیگری تغییر کرده است؛ پیش‌نویس حفظ شد.",
      );
  }
  assertContext(ctx);
  usePasswordStore.setState({ entries, revision: next });
}
