import React, { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  acceptCreatedVault,
  changeVaultPassword,
  initializeVault,
  lockVault,
  openVault,
  useVaultSession,
} from "./session";
import { createVault, unlockVault } from "./crypto";
import {
  backupHeader,
  buildBackup,
  restoreBackup,
  verifyBackup,
  type VerifiedBackup,
} from "./backup";
import { downloadBlob } from "./attachments";
import {
  finishMigration,
  migrationNeeded,
  prepareMigration,
  type MigrationPrepared,
} from "./migration";
import { buttonClass, primaryClass, ErrorText, Field, Modal } from "./ui";

export function VaultGate({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  const state = useVaultSession(),
    [secret, setSecret] = useState(""),
    [repeat, setRepeat] = useState(""),
    [recovery, setRecovery] = useState(false),
    [prepared, setPrepared] = useState<Awaited<
      ReturnType<typeof createVault>
    > | null>(null),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [restoreFile, setRestoreFile] = useState<File | null>(null),
    [pendingRestore, setPendingRestore] = useState<VerifiedBackup | null>(null);
  useEffect(() => {
    setSecret("");
    setRepeat("");
    setPrepared(null);
    setAck(false);
    setError("");
  }, [state.status, state.epoch]);
  useEffect(() => {
    setPendingRestore(null);
  }, [state.epoch]);
  if (state.status === "open" && !pendingRestore)
    return <MigrationGate>{children}</MigrationGate>;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section dir="rtl" className="max-w-lg mx-auto p-5 my-8">
      <button className={buttonClass} onClick={onBack}>
        بازگشت به خانه
      </button>
      <div className="mt-5 p-6 rounded-3xl border border-slate-700 bg-slate-900/90 space-y-5">
        <ShieldCheck className="text-teal-300" size={36} />
        <h1 className="text-2xl font-bold">خزانهٔ امن</h1>
        <p className="text-slate-300 text-sm leading-7">
          مشتریان و مدیر رمز، خزانهٔ مشترک دارند. رمز خزانه مستقل از رمز ورود
          برنامه است. قفل خودکار پس از ۱۰ دقیقه بی‌کاری فعال می‌شود.
        </p>
        <ErrorText>{error || state.error}</ErrorText>
        {state.status === "open" && pendingRestore && (
          <div className="space-y-3">
            <p role="status">
              {busy
                ? "در حال بازیابی داده‌ها و تصاویر…"
                : "بازیابی کامل نشده است؛ اجرای دوباره موارد سالم را تکرار نمی‌کند."}
            </p>
            <button
              className={primaryClass}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await restoreBackup(pendingRestore);
                  setPendingRestore(null);
                })
              }
            >
              ادامهٔ بازیابی
            </button>
            <button
              className={buttonClass}
              disabled={busy}
              onClick={() => lockVault()}
            >
              قفل خزانه
            </button>
          </div>
        )}
        {state.status === "loading" && (
          <p role="status">در حال دریافت وضعیت خزانه…</p>
        )}
        {state.status === "error" && (
          <button
            className={primaryClass}
            onClick={() => void initializeVault(state.userId!, true)}
          >
            تلاش دوباره
          </button>
        )}
        {state.status === "locked" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await openVault(secret, recovery);
                setSecret("");
              });
            }}
          >
            <Field
              label={recovery ? "کلید بازیابی" : "رمز خزانه"}
              value={secret}
              onChange={setSecret}
              secret
              required
            />
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={recovery}
                onChange={(e) => setRecovery(e.target.checked)}
              />
              ورود با کلید بازیابی
            </label>
            <button disabled={busy} className={primaryClass}>
              {busy ? "در حال بازگشایی…" : "باز کردن خزانه"}
            </button>
          </form>
        )}
        {state.status === "missing" && !prepared && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (restoreFile) {
                  const bytes = new Uint8Array(await restoreFile.arrayBuffer()),
                    metadata = backupHeader(bytes);
                  if (metadata.user_id !== state.userId)
                    throw new Error("بکاپ متعلق به این حساب نیست.");
                  const key = await unlockVault(metadata, secret, recovery);
                  const verified = await verifyBackup(bytes, {
                    userId: state.userId!,
                    keyId: metadata.key_id,
                    key,
                    epoch: state.epoch,
                  });
                  setPendingRestore(verified);
                  await acceptCreatedVault({ metadata, key, recovery: "" });
                  await restoreBackup(verified);
                  setPendingRestore(null);
                } else {
                  if (secret !== repeat)
                    throw new Error("تکرار رمز مطابقت ندارد.");
                  setPrepared(await createVault(state.userId!, secret));
                  setSecret("");
                  setRepeat("");
                }
              });
            }}
          >
            <Field
              label={
                restoreFile && recovery
                  ? "کلید بازیابی بکاپ"
                  : restoreFile
                    ? "رمز خزانهٔ بکاپ"
                    : "رمز جدید خزانه، حداقل ۱۲ نویسه"
              }
              value={secret}
              onChange={setSecret}
              secret
              required
            />
            {!restoreFile && (
              <Field
                label="تکرار رمز خزانه"
                value={repeat}
                onChange={setRepeat}
                secret
                required
              />
            )}
            <label className="block text-sm text-slate-300">
              یا بازیابی خزانه از بکاپ
              <input
                type="file"
                accept=".zip"
                className="block mt-2 w-full"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              />
            </label>
            {restoreFile && (
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={recovery}
                  onChange={(e) => setRecovery(e.target.checked)}
                />
                استفاده از کلید بازیابی
              </label>
            )}
            <button disabled={busy} className={primaryClass}>
              {busy
                ? "در حال بررسی…"
                : restoreFile
                  ? "بررسی و بازیابی بکاپ"
                  : "ساخت خزانه"}
            </button>
          </form>
        )}
        {prepared && (
          <div className="space-y-4">
            <p className="text-amber-200 text-sm leading-7">
              کلید بازیابی را در محل امن خارج از این برنامه نگه دارید. بدون این
              کلید یا رمز خزانه، بازیابی اطلاعات ممکن نیست.
            </p>
            <Field label="کلید بازیابی" value={prepared.recovery} secret />
            <button
              className={buttonClass}
              onClick={() =>
                downloadBlob(
                  new Blob([prepared.recovery], { type: "text/plain" }),
                  "vault-recovery-key.txt",
                )
              }
            >
              دریافت فایل کلید
            </button>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              کلید را در محل امن ذخیره کردم.
            </label>
            <button
              disabled={!ack || busy}
              className={primaryClass}
              onClick={() => void run(() => acceptCreatedVault(prepared))}
            >
              تأیید و ورود
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
function MigrationGate({ children }: { children: React.ReactNode }) {
  const [needed, setNeeded] = useState<boolean | null>(null),
    [prepared, setPrepared] = useState<MigrationPrepared | null>(null),
    [downloaded, setDownloaded] = useState(false),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const check = () =>
    migrationNeeded()
      .then(setNeeded)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void check();
  }, []);
  if (needed === false) return children;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      dir="rtl"
      className="max-w-xl mx-auto my-8 p-6 border border-slate-700 rounded-3xl bg-slate-900 space-y-5"
    >
      <h1 className="text-xl font-bold">انتقال امن مدیر رمز</h1>
      <p className="text-sm text-slate-300 leading-7">
        اطلاعات قدیمی در مرورگر رمز می‌شوند. تصاویر منتقل و دوباره بررسی
        می‌شوند. پیش از جایگزینی، یک بکاپ رمز‌شدهٔ قابل بازیابی دریافت می‌کنید.
        فایل‌های قدیمی که مالکیت یا مرجع مشترک آن‌ها قطعی نیست، حفظ می‌شوند.
      </p>
      <ErrorText>{error}</ErrorText>
      {needed === null ? (
        <button className={buttonClass} onClick={() => void check()}>
          بررسی وضعیت
        </button>
      ) : !prepared ? (
        <button
          disabled={busy}
          className={primaryClass}
          onClick={() =>
            void run(async () => setPrepared(await prepareMigration()))
          }
        >
          {busy
            ? "در حال انتقال، تطبیق و آزمون بکاپ…"
            : "آماده‌سازی و بررسی بکاپ"}
        </button>
      ) : (
        <>
          <p>
            {prepared.count.toLocaleString("fa-IR")} رکورد و{" "}
            {prepared.imageCount.toLocaleString("fa-IR")} تصویر بررسی شد.
          </p>
          <button
            className={primaryClass}
            onClick={() => {
              downloadBlob(
                new Blob([prepared.backup], { type: "application/zip" }),
                "vault-before-migration.zip",
              );
              setDownloaded(true);
            }}
          >
            دریافت بکاپ رمز‌شده
          </button>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={ack}
              disabled={!downloaded}
              onChange={(e) => setAck(e.target.checked)}
            />
            بکاپ را ذخیره کردم و رمز یا کلید بازیابی را دارم.
          </label>
          <button
            disabled={busy || !downloaded || !ack}
            className={primaryClass}
            onClick={() =>
              void run(async () => {
                await finishMigration(prepared);
                setPrepared(null);
                await check();
              })
            }
          >
            {busy ? "در حال تأیید نهایی…" : "نهایی‌کردن انتقال"}
          </button>
        </>
      )}
      <button
        className={buttonClass}
        disabled={busy}
        onClick={() => lockVault()}
      >
        قفل خزانه
      </button>
    </section>
  );
}
export function VaultToolbar() {
  const [panel, setPanel] = useState(false),
    [oldSecret, setOldSecret] = useState(""),
    [next, setNext] = useState(""),
    [recovery, setRecovery] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [verified, setVerified] = useState<VerifiedBackup | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button className={buttonClass} onClick={() => setPanel(true)}>
          امنیت و بکاپ
        </button>
        <button className={buttonClass} onClick={() => lockVault()}>
          <LockKeyhole size={16} />
          قفل خزانه
        </button>
      </div>
      {panel && (
        <Modal
          title="امنیت و پشتیبان خزانه"
          onClose={() => {
            if (!busy) setPanel(false);
          }}
        >
          <div className="space-y-5">
            <ErrorText>{error}</ErrorText>
            {message && (
              <p role="status" className="text-teal-300">
                {message}
              </p>
            )}
            <button
              disabled={busy}
              className={primaryClass}
              onClick={() =>
                void run(async () => {
                  const bytes = await buildBackup();
                  downloadBlob(
                    new Blob([bytes], { type: "application/zip" }),
                    "life-manager-vault.zip",
                  );
                  setMessage(
                    "بکاپ و آزمون بازگشایی همهٔ رکوردها و تصاویر موفق بود.",
                  );
                })
              }
            >
              دریافت بکاپ کامل رمز‌شده
            </button>
            <label className="block text-sm">
              آزمون بازیابی بکاپ
              <input
                type="file"
                accept=".zip"
                disabled={busy}
                className="block my-2 w-full"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void run(async () => {
                      setVerified(
                        await verifyBackup(
                          new Uint8Array(await file.arrayBuffer()),
                        ),
                      );
                      setMessage("صحت داده‌ها و تصاویر بکاپ تأیید شد.");
                    });
                }}
              />
            </label>
            {verified && (
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  بازیابی فقط موارد مفقود را اضافه می‌کند؛ رکورد متفاوت موجود
                  بازنویسی نمی‌شود.
                </p>
                <button
                  disabled={busy}
                  className={buttonClass}
                  onClick={() =>
                    void run(async () => {
                      await restoreBackup(verified);
                      setMessage("بازیابی کامل شد؛ بخش را دوباره باز کنید.");
                      setVerified(null);
                    })
                  }
                >
                  بازیابی موارد مفقود
                </button>
              </div>
            )}
            <form
              className="space-y-3 border-t border-slate-700 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await changeVaultPassword(oldSecret, next, recovery);
                  setOldSecret("");
                  setNext("");
                  setMessage(
                    "رمز خزانه تغییر کرد. کلید بازیابی قبلی همچنان معتبر است.",
                  );
                });
              }}
            >
              <h3 className="font-bold">تغییر رمز خزانه</h3>
              <Field
                label={recovery ? "کلید بازیابی" : "رمز فعلی خزانه"}
                value={oldSecret}
                onChange={setOldSecret}
                secret
                required
              />
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={recovery}
                  onChange={(e) => setRecovery(e.target.checked)}
                />
                استفاده از کلید بازیابی
              </label>
              <Field
                label="رمز جدید، حداقل ۱۲ نویسه"
                value={next}
                onChange={setNext}
                secret
                required
              />
              <button className={primaryClass} disabled={busy}>
                تغییر رمز
              </button>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
