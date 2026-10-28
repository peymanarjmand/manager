import React, { useEffect, useState } from "react";
import { PASSWORD_CATEGORIES } from "./constants";
import type { AnyPasswordEntry, PasswordCategory } from "./types";
import { loadPasswords, savePassword, usePasswordStore } from "./store";
import { VaultGate, VaultToolbar } from "../vault/VaultGate";
import { Gallery } from "../vault/Gallery";
import {
  buttonClass,
  primaryClass,
  Field,
  ErrorText,
  Modal,
} from "../vault/ui";
import { history } from "../vault/repository";
import { tehranDateTime } from "../customers/domain";

const FIELDS: Record<
  PasswordCategory,
  { key: string; label: string; secret?: boolean; multiline?: boolean }[]
> = {
  emails: [
    { key: "email", label: "آدرس ایمیل" },
    { key: "password", label: "رمز عبور", secret: true },
    { key: "phone", label: "موبایل مرتبط" },
    { key: "backupEmail", label: "ایمیل پشتیبان" },
  ],
  banks: [
    { key: "bankName", label: "نام بانک" },
    { key: "cardNumber", label: "شماره کارت" },
    { key: "cardPin", label: "رمز کارت", secret: true },
    { key: "mobileBankUser", label: "نام کاربری همراه بانک" },
    { key: "mobileBankPass", label: "رمز همراه بانک", secret: true },
  ],
  accounts: [
    { key: "website", label: "نام وب‌سایت یا اپلیکیشن" },
    { key: "username", label: "نام کاربری" },
    { key: "password", label: "رمز عبور", secret: true },
  ],
  wallets: [
    { key: "walletName", label: "نام کیف پول" },
    { key: "address", label: "آدرس کیف پول" },
    {
      key: "seedPhrase",
      label: "عبارت بازیابی",
      secret: true,
      multiline: true,
    },
  ],
  exchanges: [
    { key: "exchangeName", label: "نام صرافی" },
    { key: "username", label: "نام کاربری" },
    { key: "password", label: "رمز عبور", secret: true },
    { key: "email", label: "ایمیل" },
    { key: "phone", label: "موبایل" },
  ],
};
type Editable = AnyPasswordEntry & {
  archived?: boolean;
  [key: string]: unknown;
};
function Editor({
  entry,
  category,
  onClose,
}: {
  entry: Editable;
  category: PasswordCategory;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Editable>(() => ({ ...entry })),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title="اطلاعات حساب"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!String(draft[FIELDS[category][0].key] || "").trim()) {
            setError("عنوان اصلی حساب را وارد کنید.");
            return;
          }
          setBusy(true);
          setError("");
          void savePassword(category, draft)
            .then(onClose)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <ErrorText>{error}</ErrorText>
        {FIELDS[category].map((f) => (
          <Field
            key={f.key}
            {...f}
            value={String(draft[f.key] || "")}
            onChange={(v) => setDraft({ ...draft, [f.key]: v })}
          />
        ))}
        {category === "exchanges" && (
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={!!draft.twoFA}
              onChange={(e) => setDraft({ ...draft, twoFA: e.target.checked })}
            />
            دومرحله‌ای فعال است
          </label>
        )}
        <Field
          label="توضیحات"
          value={draft.description}
          multiline
          onChange={(description) => setDraft({ ...draft, description })}
        />
        <p className="text-xs text-slate-400">
          تصاویر را پس از ذخیره، در جزئیات حساب اضافه کنید.
        </p>
        <button className={primaryClass} disabled={busy}>
          {busy ? "در حال تأیید ذخیره…" : "ذخیره"}
        </button>
      </form>
    </Modal>
  );
}
export function PasswordManager({
  onNavigateBack,
}: {
  onNavigateBack: () => void;
}) {
  return (
    <VaultGate onBack={onNavigateBack}>
      <PasswordContent onBack={onNavigateBack} />
    </VaultGate>
  );
}
function PasswordContent({ onBack }: { onBack: () => void }) {
  const state = usePasswordStore(),
    [category, setCategory] = useState<PasswordCategory>("emails"),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [editing, setEditing] = useState<Editable | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState(""),
    [versions, setVersions] = useState<Awaited<
      ReturnType<typeof history>
    > | null>(null);
  useEffect(() => {
    void loadPasswords().catch(() => {});
  }, []);
  const entries = state.entries[category] as Editable[],
    chosen = entries.find((e) => e.id === selected);
  return (
    <section dir="rtl" className="max-w-4xl mx-auto p-4 space-y-5">
      <header className="flex justify-between gap-3 flex-wrap">
        <div className="flex gap-3 items-center">
          <button className={buttonClass} onClick={onBack}>
            بازگشت
          </button>
          <h1 className="text-xl font-bold">مدیر رمز عبور</h1>
        </div>
        <VaultToolbar />
      </header>
      <ErrorText>{error || state.error}</ErrorText>
      {!state.loaded ? (
        <button
          className={buttonClass}
          onClick={() => void loadPasswords().catch(() => {})}
        >
          دریافت کامل اطلاعات
        </button>
      ) : (
        <>
          <nav className="flex overflow-x-auto gap-2">
            {PASSWORD_CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`${buttonClass} whitespace-nowrap ${c.id === category ? "bg-teal-800" : ""}`}
                onClick={() => {
                  setCategory(c.id);
                  setSelected(null);
                }}
              >
                {c.title}
              </button>
            ))}
          </nav>
          <div className="flex gap-3 flex-wrap">
            <button
              className={primaryClass}
              onClick={() =>
                setEditing({ id: crypto.randomUUID(), category } as Editable)
              }
            >
              افزودن حساب
            </button>
            <button
              className={buttonClass}
              onClick={() => setArchived(!archived)}
            >
              {archived ? "حساب‌های فعال" : "بایگانی"}
            </button>
            <button
              className={buttonClass}
              onClick={() => void loadPasswords().catch(() => {})}
            >
              به‌روزرسانی
            </button>
          </div>
          <Field
            label="جست‌وجو در نام و ایمیل حساب"
            value={search}
            onChange={setSearch}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            {entries
              .filter((e) => !!e.archived === archived)
              .filter((e) =>
                FIELDS[category]
                  .filter((f) => !f.secret)
                  .map((f) => e[f.key])
                  .join(" ")
                  .toLocaleLowerCase("fa")
                  .includes(search.toLocaleLowerCase("fa")),
              )
              .map((e) => (
                <button
                  key={e.id}
                  className="p-5 bg-slate-900 border border-slate-700 rounded-2xl text-right break-all"
                  onClick={() => {
                    setSelected(e.id);
                    setVersions(null);
                  }}
                >
                  {String(e[FIELDS[category][0].key] || "حساب")}
                </button>
              ))}
          </div>
        </>
      )}
      {chosen && !editing && (
        <Modal
          title={String(chosen[FIELDS[category][0].key] || "حساب")}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button
                className={primaryClass}
                onClick={() => setEditing(chosen)}
              >
                ویرایش
              </button>
              <button
                className={buttonClass}
                onClick={() =>
                  void savePassword(category, {
                    ...chosen,
                    archived: !chosen.archived,
                  }).catch((e) => setError(e.message))
                }
              >
                {chosen.archived ? "خروج از بایگانی" : "بایگانی"}
              </button>
              <button
                className={buttonClass}
                onClick={() =>
                  void history("password", "lifeManagerPasswords")
                    .then(setVersions)
                    .catch((e) => setError(e.message))
                }
              >
                تاریخچه
              </button>
            </div>
            {FIELDS[category].map((f) => (
              <Field key={f.key} {...f} value={String(chosen[f.key] || "")} />
            ))}
            {category === "exchanges" && (
              <Field
                label="دومرحله‌ای"
                value={chosen.twoFA ? "فعال" : "غیرفعال"}
              />
            )}
            <Field label="توضیحات" value={chosen.description} multiline />
            <Gallery parent={{ kind: "password", id: chosen.id }} />
            {versions &&
              versions.map((v) => (
                <Field
                  key={v.revision}
                  label={`نسخهٔ ${v.revision} · ${tehranDateTime(v.recorded_at)}`}
                  secret
                  multiline
                  value={JSON.stringify(v.data, null, 2)}
                />
              ))}
          </div>
        </Modal>
      )}
      {editing && (
        <Editor
          key={editing.id}
          entry={editing}
          category={category}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
