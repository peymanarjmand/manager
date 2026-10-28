import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Plus } from "lucide-react";
import { VaultGate, VaultToolbar } from "../vault/VaultGate";
import { Gallery } from "../vault/Gallery";
import {
  buttonClass,
  primaryClass,
  ErrorText,
  Field,
  Modal,
  Select,
  CopyButton,
} from "../vault/ui";
import { history, saveEntity } from "../vault/repository";
import { useCustomers, reloadCustomers } from "./store";
import {
  balance,
  balanceLabel,
  jalaliDate,
  tehranDateTime,
  toman,
  safeSearch,
  renewalGroup,
  amount,
  ledgerDelta,
} from "./domain";
import {
  CustomerFields,
  ProjectFields,
  ServiceFields,
  LedgerFields,
  initialData,
  validatePayload,
} from "./forms";
import { SERVICE_TEMPLATES } from "./templates";
import {
  balanceColor,
  FinanceLegend,
  LedgerAmount,
  LedgerStatus,
  ledgerStyle,
} from "./finance";
import type {
  Customer,
  Entity,
  EntityKind,
  LedgerEntry,
  Note,
  Payloads,
  Project,
  ServiceRecord,
} from "./types";

type AnyEntity = Entity<Payloads[EntityKind]>;
interface Editing {
  kind: EntityKind;
  entity?: AnyEntity;
  customerId?: string;
}
function EntityEditor({
  editing,
  onClose,
  onSaved,
}: {
  editing: Editing;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { kind, entity, customerId } = editing,
    state = useCustomers();
  const [id] = useState(() => entity?.id || crypto.randomUUID()),
    [value, setValue] = useState<Payloads[EntityKind]>(() =>
      structuredClone(entity?.data || initialData(kind)),
    ),
    [projectId, setProjectId] = useState(entity?.project_id || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [savedRevision, setSavedRevision] = useState(entity?.revision || 0);
  const projects = state.projects.filter((p) => p.customer_id === customerId),
    banks = state.records.filter(
      (r) => r.customer_id === customerId && r.data.type === "bank",
    );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validatePayload(kind, value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const normalized =
        kind === "ledger"
          ? {
              ...value,
              amount: amount((value as LedgerEntry).amount).toString(),
            }
          : value;
      const saved = await saveEntity(kind, normalized, {
        id,
        revision: savedRevision,
        customerId,
        projectId,
        archivedAt: entity?.archived_at,
      });
      setSavedRevision(saved.revision); // if a subsequent refresh fails, a retry updates this identity
      await reloadCustomers();
      onSaved(id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${entity ? "ویرایش" : "افزودن"} ${{ customer: "مشتری", project: "پروژه", record: "حساب یا سرویس", ledger: "ثبت مالی", note: "یادداشت" }[kind]}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="space-y-5">
        <ErrorText>{error}</ErrorText>
        {kind === "customer" && (
          <CustomerFields value={value as Customer} onChange={setValue} />
        )}
        {kind === "project" && (
          <ProjectFields value={value as Project} onChange={setValue} />
        )}
        {kind === "record" && (
          <ServiceFields
            value={value as ServiceRecord}
            onChange={setValue}
            projects={projects}
            banks={banks}
          />
        )}
        {kind === "ledger" && (
          <LedgerFields
            value={value as LedgerEntry}
            onChange={setValue}
            projects={projects}
            projectId={projectId}
            onProject={setProjectId}
            banks={banks}
          />
        )}
        {kind === "note" && (
          <>
            <Field
              label="عنوان"
              required
              value={(value as Note).title}
              onChange={(title) => setValue({ ...value, title })}
            />
            <Field
              label="متن یادداشت"
              multiline
              value={(value as Note).text}
              onChange={(text) => setValue({ ...value, text } as Note)}
            />
          </>
        )}
        <p className="text-xs text-slate-400">
          تصاویر پس از ذخیره از داخل همین رکورد افزوده می‌شوند.
        </p>
        <div className="flex gap-2 sticky bottom-0 bg-slate-900 py-3">
          <button disabled={busy} className={primaryClass}>
            {busy ? "در حال تأیید ذخیره…" : "ذخیره"}
          </button>
          <button
            type="button"
            disabled={busy}
            className={buttonClass}
            onClick={onClose}
          >
            انصراف
          </button>
        </div>
      </form>
    </Modal>
  );
}
function RecordView({ record }: { record: ServiceRecord }) {
  const template = SERVICE_TEMPLATES[record.type] || SERVICE_TEMPLATES.custom;
  const renderField = (f: (typeof template.fields)[number]) => (
    <Field
      key={f.key}
      label={f.label}
      value={record.fields[f.key]}
      secret={f.secret}
      multiline={f.multiline}
    />
  );
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {record.fields.loginMethod && (
          <Field label="روش ورود" value={record.fields.loginMethod} />
        )}
        {template.fields
          .filter((f) => !f.group && record.fields[f.key])
          .map(renderField)}
      </div>
      {[...new Set(template.fields.map((f) => f.group).filter(Boolean))].map(
        (group) => {
          const fields = template.fields.filter(
            (f) => f.group === group && record.fields[f.key],
          );
          return fields.length ? (
            <fieldset
              key={group}
              className="border border-slate-700 rounded-xl p-3"
            >
              <legend className="font-bold px-2">{group}</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                {fields.map(renderField)}
              </div>
            </fieldset>
          ) : null;
        },
      )}
      {record.customFields.map((f) => (
        <Field
          key={f.id}
          label={f.label}
          value={f.type === "date" ? jalaliDate(f.value) : f.value}
          multiline={f.type === "multiline"}
          secret={f.type === "secret"}
        />
      ))}
      {record.recoveryCodes.map((c, i) => (
        <div key={c.id}>
          <Field
            label={`کد بازیابی ${i + 1}${c.used ? " · استفاده‌شده" : ""}`}
            value={c.value}
            secret
          />
        </div>
      ))}
      {record.renewalDate && (
        <Field label="تاریخ تمدید" value={jalaliDate(record.renewalDate)} />
      )}{" "}
      {record.renewalCost && (
        <Field
          label="هزینهٔ پیشنهادی تمدید"
          value={toman(amount(record.renewalCost))}
        />
      )}{" "}
      {record.notes && <Field label="یادداشت" value={record.notes} multiline />}
    </div>
  );
}
function CustomerProfile({ row }: { row: Entity<Customer> }) {
  const c = row.data;
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          ["نام", c.firstName],
          ["نام خانوادگی", c.lastName],
          ["تاریخ تولد", c.birthDate ? jalaliDate(c.birthDate) : ""],
          ["کد ملی", c.nationalId],
          ["نام پدر", c.fatherName],
          ["شرکت", c.company],
        ].map(([label, value]) => (
          <Field key={label} label={label!} value={value} />
        ))}
      </div>
      {[
        ["موبایل", c.mobiles],
        ["تلفن ثابت", c.phones],
        ["ایمیل", c.emails],
      ].map(([label, values]) => (
        <div key={label as string}>
          {(values as Customer["mobiles"])
            .filter((x) => x.value)
            .map((v, i) => (
              <Field
                key={i}
                label={`${label}${v.label ? ` · ${v.label}` : ""}`}
                value={v.value}
              />
            ))}
        </div>
      ))}
      <Field label="نشانی" value={c.address} multiline />
      <Field label="توضیحات" value={c.notes} multiline />
      <Gallery
        parent={{ kind: "customer", id: row.id }}
        customerId={row.id}
        label="روی کارت ملی"
      />
      <Gallery
        parent={{ kind: "customer", id: row.id }}
        customerId={row.id}
        label="پشت کارت ملی"
      />
      <Gallery
        parent={{ kind: "customer", id: row.id }}
        customerId={row.id}
        label="تصاویر تکمیلی"
      />
    </div>
  );
}
function EntityDetails({
  kind,
  row,
  customerId,
  onClose,
  onEdit,
  onArchive,
}: {
  kind: EntityKind;
  row: AnyEntity;
  customerId: string;
  onClose: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const state = useCustomers(),
    [versions, setVersions] = useState<Awaited<
      ReturnType<typeof history>
    > | null>(null),
    [error, setError] = useState("");
  const p = row.data as Project,
    l = row.data as LedgerEntry,
    r = row.data as ServiceRecord;
  return (
    <Modal title={(row.data as Project).title || "جزئیات"} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex gap-2 flex-wrap">
          <button className={primaryClass} onClick={onEdit}>
            ویرایش
          </button>
          <button className={buttonClass} onClick={onArchive}>
            {kind === "ledger"
              ? l.voided
                ? "ابطال شده"
                : "ابطال ثبت مالی"
              : row.archived_at
                ? "خروج از بایگانی"
                : "بایگانی"}
          </button>
          <button
            className={buttonClass}
            onClick={() =>
              void history(kind, row.id)
                .then(setVersions)
                .catch((e) => setError(e.message))
            }
          >
            تاریخچهٔ ویرایش
          </button>
        </div>
        <ErrorText>{error}</ErrorText>
        {kind === "project" && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="نوع پروژه" value={p.type} />
              <Field label="وضعیت" value={p.status} />
              <Field
                label="شروع"
                value={p.startDate ? jalaliDate(p.startDate) : ""}
              />
              <Field
                label="موعد تحویل"
                value={p.dueDate ? jalaliDate(p.dueDate) : ""}
              />
              <Field
                label="مبلغ توافق‌شده"
                value={p.contractAmount ? toman(amount(p.contractAmount)) : ""}
              />
            </div>
            <Field label="سایت" value={p.siteUrl} />
            <Field label="اپلیکیشن" value={p.appUrl} />
            <Field label="مخزن" value={p.repository} />
            <Field label="توضیحات" value={p.description} multiline />
          </>
        )}
        {kind === "record" && (
          <>
            <p className="text-sm text-slate-400">
              {SERVICE_TEMPLATES[r.type]?.title} ·{" "}
              {r.projectIds
                .map(
                  (id) =>
                    state.projects.find((p) => p.id === id)?.data.title ||
                    "پروژه",
                )
                .join("، ") || "عمومی مشتری"}
            </p>
            <RecordView record={r} />
          </>
        )}
        {kind === "ledger" && (
          <>
            <LedgerStatus entry={l} />
            <div>
              <p className="text-sm text-slate-300 mb-1.5">مبلغ</p>
              <div className="flex items-center gap-2">
                <LedgerAmount entry={l} />
                <CopyButton value={toman(amount(l.amount))} />
              </div>
            </div>
            <Field
              label="تاریخ و ساعت ایران"
              value={tehranDateTime(l.occurredAt)}
            />
            <Field label="روش دریافت / پرداخت" value={l.method} />
            <Field
              label="پروژه"
              value={
                state.projects.find((p) => p.id === row.project_id)?.data
                  .title || "عمومی مشتری"
              }
            />
            <Field
              label="حساب مرتبط"
              value={
                state.records.find((r) => r.id === l.bankRecordId)?.data.title
              }
            />
            <Field label="شماره پیگیری" value={l.reference} />
            <Field label="توضیحات و رسید" value={l.description} multiline />
          </>
        )}
        {kind === "note" && (
          <Field
            label="متن یادداشت"
            value={(row.data as Note).text}
            multiline
          />
        )}
        <Gallery parent={{ kind, id: row.id }} customerId={customerId} />
        {versions && (
          <div className="border-t border-slate-700 pt-4 space-y-3">
            <h3>نسخه‌های قبلی</h3>
            {!versions.length && (
              <p className="text-sm text-slate-400">
                هنوز ویرایشی ثبت نشده است.
              </p>
            )}
            {versions.map((v) => (
              <Field
                key={v.revision}
                label={`نسخهٔ ${v.revision} · ${tehranDateTime(v.recorded_at)}`}
                value={JSON.stringify(v.data, null, 2)}
                secret
                multiline
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
export function Customers({ onNavigateBack }: { onNavigateBack: () => void }) {
  return (
    <VaultGate onBack={onNavigateBack}>
      <CustomersContent onBack={onNavigateBack} />
    </VaultGate>
  );
}
export function CustomersContent({ onBack }: { onBack: () => void }) {
  const state = useCustomers(),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("profile"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [archives, setArchives] = useState(false),
    [editing, setEditing] = useState<Editing | null>(null),
    [detail, setDetail] = useState<{ kind: EntityKind; id: string } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void reloadCustomers().catch(() => {});
  }, []);
  const customer = state.customers.find((c) => c.id === selected),
    relevant = state.ledger.filter((l) => l.customer_id === selected),
    customerBalance = balance(relevant);
  const balances = useMemo(() => {
    const result = new Map(state.customers.map((c) => [c.id, 0n]));
    for (const row of state.ledger)
      if (!row.archived_at && result.has(row.customer_id!))
        result.set(
          row.customer_id!,
          result.get(row.customer_id!)! + ledgerDelta(row.data),
        );
    return result;
  }, [state.customers, state.ledger]);
  const totals = Array.from(balances.values()).reduce(
    (x, b) => ({
      receivable: x.receivable + (b > 0n ? b : 0n),
      payable: x.payable + (b < 0n ? -b : 0n),
    }),
    { receivable: 0n, payable: 0n },
  );
  const visible = state.customers
    .filter((c) => !!c.archived_at === archives)
    .filter((c) =>
      [
        c.data.firstName,
        c.data.lastName,
        c.data.company,
        ...c.data.mobiles.map((v) => v.value),
        ...c.data.emails.map((v) => v.value),
      ]
        .join(" ")
        .toLocaleLowerCase("fa")
        .includes(search.toLocaleLowerCase("fa")),
    )
    .filter(
      (c) =>
        filter === "all" ||
        (filter === "debt"
          ? balances.get(c.id)! > 0n
          : filter === "credit"
            ? balances.get(c.id)! < 0n
            : balances.get(c.id) === 0n),
    );
  const source = detail
    ? (
        {
          project: state.projects,
          record: state.records,
          ledger: state.ledger,
          note: state.notes,
          customer: state.customers,
        }[detail.kind] as AnyEntity[]
      ).find((r) => r.id === detail.id)
    : undefined;
  const changeArchive = async (kind: EntityKind, row: AnyEntity) => {
    if (kind === "ledger" && (row.data as LedgerEntry).voided) return;
    if (
      !window.confirm(
        kind === "ledger"
          ? "این ثبت مالی با حفظ سابقه باطل شود؟"
          : "وضعیت بایگانی تغییر کند؟ سوابق حذف نمی‌شوند.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await saveEntity(
        kind,
        kind === "ledger"
          ? ({ ...row.data, voided: true } as LedgerEntry)
          : row.data,
        {
          id: row.id,
          revision: row.revision,
          customerId: kind === "customer" ? undefined : row.customer_id,
          projectId: row.project_id,
          archivedAt:
            kind === "ledger"
              ? row.archived_at
              : row.archived_at
                ? null
                : new Date().toISOString(),
        },
      );
      await reloadCustomers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const cards = (kind: EntityKind, rows: AnyEntity[]) => (
    <div className="space-y-3">
      {!rows.length && (
        <p className="text-slate-400 py-8 text-center">موردی ثبت نشده است.</p>
      )}
      {rows.map((row) => (
        <button
          key={row.id}
          onClick={() => setDetail({ kind, id: row.id })}
          className={`block w-full text-right rounded-2xl border border-slate-700 bg-slate-900/70 p-4 hover:bg-slate-800/70 ${kind === "ledger" ? `border-r-4 ${ledgerStyle(row.data as LedgerEntry).border}` : ""}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="font-bold min-w-0 break-words">
              {(row.data as Project).title}
            </span>
            {kind === "ledger" && (
              <LedgerAmount entry={row.data as LedgerEntry} />
            )}
          </div>
          {kind === "ledger" && (
            <div className="mt-3">
              <LedgerStatus entry={row.data as LedgerEntry} />
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">
            {row.archived_at ? "بایگانی · " : ""}
            {kind === "ledger"
              ? `${(row.data as LedgerEntry).voided ? "باطل‌شده · " : ""}${tehranDateTime((row.data as LedgerEntry).occurredAt)} · ${state.projects.find((p) => p.id === row.project_id)?.data.title || "عمومی مشتری"}`
              : kind === "record"
                ? SERVICE_TEMPLATES[(row.data as ServiceRecord).type]?.title
                : kind === "project"
                  ? jalaliDate((row.data as Project).dueDate)
                  : ""}
          </p>
        </button>
      ))}
    </div>
  );
  return (
    <section dir="rtl" className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      <header className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className={buttonClass}
            aria-label="بازگشت"
            onClick={() =>
              selected ? (setSelected(null), setSearch("")) : onBack()
            }
          >
            <ArrowRight size={20} />
          </button>
          <BriefcaseBusiness className="text-teal-300" />
          <div>
            <h1 className="text-xl font-bold">
              {customer
                ? `${customer.data.firstName} ${customer.data.lastName}`
                : "مشتریان"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              پرونده و دفتر مالی امن · تومان
            </p>
          </div>
        </div>
        <VaultToolbar />
      </header>
      <ErrorText>{error || state.error}</ErrorText>
      {!state.loaded ? (
        <div className="p-8 text-center space-y-4">
          <p>
            {state.loading
              ? "در حال دریافت و بازگشایی کامل اطلاعات…"
              : "اطلاعات کامل دریافت نشده است."}
          </p>
          <button
            className={buttonClass}
            disabled={state.loading}
            onClick={() => void reloadCustomers().catch(() => {})}
          >
            دریافت دوباره
          </button>
        </div>
      ) : !customer ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-900">
              <p className="text-sm text-slate-300">طلب از مشتریان</p>
              <p className="text-blue-300 text-lg mt-2">
                {toman(totals.receivable)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-900">
              <p className="text-sm text-slate-300">بدهی / اعتبار مشتریان</p>
              <p className="text-amber-300 text-lg mt-2">
                {toman(totals.payable)}
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              className={primaryClass}
              onClick={() => setEditing({ kind: "customer" })}
            >
              <Plus size={18} />
              مشتری جدید
            </button>
            <button
              className={buttonClass}
              onClick={() => setArchives(!archives)}
            >
              {archives ? "مشتریان فعال" : "بایگانی مشتریان"}
            </button>
            <button
              className={buttonClass}
              disabled={busy}
              onClick={() => void reloadCustomers().catch(() => {})}
            >
              به‌روزرسانی
            </button>
          </div>
          <div className="grid sm:grid-cols-[1fr_13rem] gap-3">
            <Field
              label="جست‌وجوی نام، موبایل یا ایمیل"
              value={search}
              onChange={setSearch}
            />
            <Select
              label="وضعیت مالی"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "همه" },
                { value: "debt", label: "مشتری بدهکار" },
                { value: "credit", label: "مشتری بستانکار" },
                { value: "settled", label: "تسویه" },
              ]}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {visible.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelected(c.id);
                  setTab("profile");
                  setSearch("");
                }}
                className="text-right p-5 rounded-2xl bg-slate-900 border border-slate-700 hover:border-teal-500"
              >
                <h2 className="font-bold">
                  {c.data.firstName} {c.data.lastName}
                </h2>
                <p className="text-xs text-slate-400 mt-2">
                  {c.data.company ||
                    c.data.mobiles.find((v) => v.value)?.value ||
                    c.data.emails.find((v) => v.value)?.value}
                </p>
                <p
                  className={`text-sm mt-4 ${balanceColor(balances.get(c.id)!)}`}
                >
                  {balanceLabel(balances.get(c.id)!)} ·{" "}
                  {toman(
                    balances.get(c.id)! < 0n
                      ? -balances.get(c.id)!
                      : balances.get(c.id)!,
                  )}
                </p>
              </button>
            ))}
          </div>
          {!visible.length && (
            <p className="text-center text-slate-400 py-10">
              مشتری‌ای برای این فیلتر پیدا نشد.
            </p>
          )}
          <div className="rounded-2xl border border-slate-700 p-4 space-y-3">
            <h2 className="font-bold">یادآوری تمدید سرویس‌ها</h2>
            {(["overdue", "week", "month"] as const).map((g, i) => (
              <div key={g}>
                <h3 className="text-sm text-slate-400 mb-2">
                  {["گذشته از موعد", "تا ۷ روز آینده", "۸ تا ۳۰ روز آینده"][i]}
                </h3>
                {state.records
                  .filter(
                    (r) =>
                      !r.archived_at &&
                      r.data.renewalDate &&
                      renewalGroup(r.data.renewalDate) === g,
                  )
                  .map((r) => (
                    <button
                      key={r.id}
                      className="block text-sm py-2 text-teal-200"
                      onClick={() => {
                        setSelected(r.customer_id!);
                        setTab("record");
                        setDetail({ kind: "record", id: r.id });
                      }}
                    >
                      {r.data.title} ·{" "}
                      {
                        state.customers.find((c) => c.id === r.customer_id)
                          ?.data.lastName
                      }{" "}
                      · {jalaliDate(r.data.renewalDate)}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-700 p-4 flex gap-3 items-center justify-between flex-wrap">
            <div>
              <p className="text-xs text-slate-400">
                ماندهٔ کل مشتری، شامل همهٔ پروژه‌ها
              </p>
              <p className={`text-lg mt-1 ${balanceColor(customerBalance)}`}>
                {balanceLabel(customerBalance)} ·{" "}
                {toman(
                  customerBalance < 0n ? -customerBalance : customerBalance,
                )}
              </p>
            </div>
            <button
              disabled={busy}
              className={buttonClass}
              onClick={() => void changeArchive("customer", customer)}
            >
              {customer.archived_at ? "خروج از بایگانی" : "بایگانی مشتری"}
            </button>
          </div>
          <nav
            aria-label="قسمت‌های پرونده"
            className="flex overflow-x-auto gap-2 pb-2"
          >
            {[
              ["profile", "مشخصات"],
              ["project", "پروژه‌ها"],
              ["ledger", "مالی"],
              ["record", "حساب‌ها و سرویس‌ها"],
              ["note", "مدارک و یادداشت‌ها"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={`${buttonClass} whitespace-nowrap ${tab === id ? "bg-teal-800 border-teal-500" : ""}`}
                onClick={() => {
                  setTab(id);
                  setSearch("");
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex justify-between gap-3">
            <h2 className="text-lg font-bold">
              {tab === "profile"
                ? "مشخصات مشتری"
                : tab === "ledger"
                  ? "دفتر مالی"
                  : tab === "record"
                    ? "حساب‌ها و سرویس‌ها"
                    : tab === "project"
                      ? "پروژه‌ها"
                      : "مدارک و یادداشت‌ها"}
            </h2>
            <button
              className={primaryClass}
              onClick={() =>
                setEditing({
                  kind: tab === "profile" ? "customer" : (tab as EntityKind),
                  entity: tab === "profile" ? customer : undefined,
                  customerId: tab === "profile" ? undefined : customer.id,
                })
              }
            >
              {tab === "profile" ? "ویرایش مشخصات" : "افزودن"}
            </button>
          </div>
          {tab === "profile" ? (
            <CustomerProfile row={customer} />
          ) : tab === "project" ? (
            cards(
              "project",
              state.projects.filter((p) => p.customer_id === selected),
            )
          ) : tab === "ledger" ? (
            <>
              <FinanceLegend />
              <p className="text-xs text-slate-400">
                هر هزینه یک‌بار طلب ایجاد می‌کند. دریافت عمومی به تقسیم بین
                پروژه‌ها نیاز ندارد. ثبت باطل‌شده در مانده نیست.
              </p>
              {cards(
                "ledger",
                relevant
                  .slice()
                  .sort((a, b) =>
                    b.data.occurredAt.localeCompare(a.data.occurredAt),
                  ),
              )}
            </>
          ) : tab === "record" ? (
            <>
              <Field
                label="جست‌وجوی عنوان یا حساب (بدون رمزها و کلیدها)"
                value={search}
                onChange={setSearch}
              />
              {cards(
                "record",
                state.records.filter(
                  (r) =>
                    r.customer_id === selected &&
                    safeSearch(r.data).includes(search.toLocaleLowerCase("fa")),
                ),
              )}
            </>
          ) : (
            cards(
              "note",
              state.notes.filter((n) => n.customer_id === selected),
            )
          )}
        </>
      )}
      {editing && (
        <EntityEditor
          key={editing.entity?.id || `new-${editing.kind}`}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => {
            if (editing.kind === "customer") setSelected(id);
            setEditing(null);
          }}
        />
      )}
      {detail && source && !editing && (
        <EntityDetails
          key={source.id}
          kind={detail.kind}
          row={source}
          customerId={source.customer_id || selected!}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing({
              kind: detail.kind,
              entity: source,
              customerId: source.customer_id,
            });
          }}
          onArchive={() => void changeArchive(detail.kind, source)}
        />
      )}
    </section>
  );
}
