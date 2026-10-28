import { toast } from "../../lib/toast";
import { onVaultLock, useVaultSession } from "./session";
let generation = 0;
let pending: { ticket: number; value: string; timer: number } | null = null;
function cancelPending() {
  if (pending) {
    window.clearTimeout(pending.timer);
    pending.value = "";
    pending = null;
  }
}
async function clearPending(): Promise<void> {
  const item = pending;
  pending = null;
  if (!item) return;
  window.clearTimeout(item.timer);
  const value = item.value;
  item.value = "";
  try {
    if (
      item.ticket === generation &&
      (await navigator.clipboard.readText()) === value
    )
      await navigator.clipboard.writeText("");
  } catch {
    /* Conditional clearing may require browser permission. */
  }
}
onVaultLock(() => void clearPending());
export async function copyValue(value: string, secret = false): Promise<void> {
  if (!value) return;
  const epoch = useVaultSession.getState().epoch;
  try {
    await navigator.clipboard.writeText(value);
    if (useVaultSession.getState().epoch !== epoch) {
      try {
        if ((await navigator.clipboard.readText()) === value)
          await navigator.clipboard.writeText("");
      } catch {
        /* permission dependent */
      }
      return;
    }
    cancelPending();
    const ticket = ++generation;
    toast.success("کپی شد");
    if (secret)
      pending = {
        ticket,
        value,
        timer: window.setTimeout(() => void clearPending(), 25_000),
      };
  } catch {
    toast.error("مرورگر اجازهٔ کپی نداد.");
  }
}
