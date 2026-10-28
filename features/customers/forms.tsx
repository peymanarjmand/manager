import React, { useState } from "react";
import { DateField, Field, Select, buttonClass, inputClass } from "../vault/ui";
import {
  digits,
  localTehranInput,
  tehranLocalToIso,
  validateCustomer,
  validateLedger,
  amount,
} from "./domain";
import {
  SERVICE_TEMPLATES,
  LEDGER_OPTIONS,
  type ServiceField,
} from "./templates";
import { toBase64 } from "../vault/crypto";
import { LedgerStatus } from "./finance";
import type {
  ContactValue,
  Customer,
  Project,
  ServiceRecord,
  LedgerEntry,
  Note,
  Entity,
  Payloads,
  EntityKind,
} from "./types";

function Contacts({
  title,
  values,
  onChange,
  normalize = false,
}: {
  title: string;
  values: ContactValue[];
  onChange: (x: ContactValue[]) => void;
  normalize?: boolean;
}) {
  return (
    <fieldset className="space-y-2 border-t border-slate-700 pt-3">
      <legend className="text-sm px-1">{title}</legend>
      {values.map((v, i) => (
        <div className="grid grid-cols-[5rem_1fr_auto] gap-2" key={i}>
          <input
            className={inputClass}
            aria-label={`برچسب ${title} ${i + 1}`}
            placeholder="برچسب"
            value={v.label}
            onChange={(e) =>
              onChange(
                values.map((x, n) =>
                  n === i ? { ...x, label: e.target.value } : x,
                ),
              )
            }
          />
          <Field
            label={`${title} ${i + 1}`}
            value={v.value}
            onChange={(value) =>
              onChange(
                values.map((x, n) =>
                  n === i
                    ? { ...x, value: normalize ? digits(value) : value }
                    : x,
                ),
              )
            }
            dir="ltr"
          />
          <button
            type="button"
            className={buttonClass}
            aria-label={`حذف ${title} ${i + 1}`}
            onClick={() => onChange(values.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange([...values, { label: "", value: "" }])}
      >
        افزودن {title}
      </button>
    </fieldset>
  );
}
export function CustomerFields({
  value,
  onChange,
}: {
  value: Customer;
  onChange: (x: Customer) => void;
}) {
  const set = (key: keyof Customer, v: unknown) =>
    onChange({ ...value, [key]: v });
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="نام"
          required
          value={value.firstName}
          onChange={(v) => set("firstName", v)}
        />
        <Field
          label="نام خانوادگی"
          required
          value={value.lastName}
          onChange={(v) => set("lastName", v)}
        />
        <DateField
          label="تاریخ تولد"
          value={value.birthDate}
          onChange={(v) => set("birthDate", v)}
        />
        <Field
          label="کد ملی"
          value={value.nationalId}
          onChange={(v) => set("nationalId", digits(v))}
        />
        <Field
          label="نام پدر"
          value={value.fatherName}
          onChange={(v) => set("fatherName", v)}
        />
        <Field
          label="شرکت"
          value={value.company}
          onChange={(v) => set("company", v)}
        />
      </div>
      <p className="text-xs text-slate-400">
        حداقل یک موبایل یا ایمیل معتبر لازم است؛ دیگر مشخصات اختیاری‌اند.
      </p>
      <Contacts
        title="موبایل"
        values={value.mobiles}
        onChange={(v) => set("mobiles", v)}
        normalize
      />
      <Contacts
        title="تلفن ثابت"
        values={value.phones}
        onChange={(v) => set("phones", v)}
        normalize
      />
      <Contacts
        title="ایمیل"
        values={value.emails}
        onChange={(v) => set("emails", v)}
      />
      <Field
        label="آدرس"
        value={value.address}
        onChange={(v) => set("address", v)}
        multiline
      />
      <Field label="کد پستی" value={value.postalCode}
        onChange={(v) => set("postalCode", digits(v))} dir="ltr" />
      <Field
        label="توضیحات"
        value={value.notes}
        onChange={(v) => set("notes", v)}
        multiline
      />
    </>
  );
}
export function ProjectFields({
  value,
  onChange,
}: {
  value: Project;
  onChange: (x: Project) => void;
}) {
  const set = (k: keyof Project, v: string) => onChange({ ...value, [k]: v });
  return (
    <>
      <Field
        label="عنوان پروژه"
        value={value.title}
        onChange={(v) => set("title", v)}
        required
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="نوع"
          value={value.type}
          onChange={(v) => set("type", v)}
          options={[
            { value: "website", label: "وب‌سایت" },
            { value: "app", label: "اپلیکیشن" },
            { value: "other", label: "سایر" },
          ]}
        />
        <Select
          label="وضعیت"
          value={value.status}
          onChange={(v) => set("status", v)}
          options={[
            { value: "planned", label: "برنامه‌ریزی" },
            { value: "active", label: "در حال انجام" },
            { value: "waiting", label: "در انتظار" },
            { value: "completed", label: "تکمیل‌شده" },
          ]}
        />
        <DateField
          label="شروع"
          value={value.startDate}
          onChange={(v) => set("startDate", v)}
        />
        <DateField
          label="موعد تحویل"
          value={value.dueDate}
          onChange={(v) => set("dueDate", v)}
        />
      </div>
      <Field
        label="مبلغ توافق‌شده (تومان، اختیاری)"
        money
        value={value.contractAmount}
        onChange={(v) => set("contractAmount", digits(v))}
      />
      <p className="text-xs text-slate-400">
        مبلغ توافق‌شده طلب ایجاد نمی‌کند؛ طلب را در بخش مالی ثبت کنید.
      </p>
      {(["siteUrl", "appUrl", "repository", "description"] as const).map(
        (k, i) => (
          <Field
            key={k}
            label={["لینک سایت", "لینک اپلیکیشن", "لینک مخزن", "توضیحات"][i]}
            value={value[k]}
            onChange={(v) => set(k, v)}
            multiline={k === "description"}
          />
        ),
      )}
    </>
  );
}
export function ServiceFields({
  value,
  onChange,
  projects,
  banks = [],
}: {
  value: ServiceRecord;
  onChange: (x: ServiceRecord) => void;
  projects: Entity<Project>[];
  banks?: Entity<ServiceRecord>[];
}) {
  const template = SERVICE_TEMPLATES[value.type] || SERVICE_TEMPLATES.custom;
  const setField = (key: string, v: string) =>
    onChange({ ...value, fields: { ...value.fields, [key]: v } });
  const method = value.fields.loginMethod || "email";
  const renderField = (field: ServiceField) => (
    <Field
      key={field.key}
      label={field.label}
      value={value.fields[field.key]}
      onChange={(v) => setField(field.key, field.number ? digits(v) : v)}
      secret={field.secret}
      multiline={field.multiline}
    />
  );
  return (
    <>
      <Field
        label="عنوان رکورد"
        value={value.title}
        onChange={(title) => onChange({ ...value, title })}
        required
      />
      <Select
        label="نوع حساب یا سرویس"
        value={value.type}
        onChange={(type) => onChange({ ...value, type })}
        options={Object.entries(SERVICE_TEMPLATES).map(([key, t]) => ({
          value: key,
          label: t.title,
        }))}
      />
      {template.loginMethods && (
        <Select
          label="روش ورود"
          value={method}
          onChange={(v) => setField("loginMethod", v)}
          options={["email", "google", "github", "other"].map((v, i) => ({
            value: v,
            label: ["ایمیل و رمز", "گوگل", "گیتهاب", "سایر"][i],
          }))}
        />
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        {template.fields
          .filter(
            (field) =>
              (!field.login ||
                (method === "email"
                  ? field.key !== "linkedAccount"
                  : field.key === "linkedAccount")) &&
              !(
                value.type === "digipay" &&
                ["client_id", "client_secret", "authorization"].includes(
                  field.key,
                )
              ) &&
              !field.group &&
              field.key !== "bankAccount",
          )
          .map(renderField)}
      </div>
      {[...new Set(template.fields.map((f) => f.group).filter(Boolean))].map(
        (group) => (
          <fieldset
            key={group}
            className="border border-slate-700 rounded-xl p-3"
          >
            <legend className="font-bold px-2">{group}</legend>
            <div className="grid sm:grid-cols-2 gap-4">
              {template.fields
                .filter((f) => f.group === group)
                .map(renderField)}
            </div>
          </fieldset>
        ),
      )}
      {template.fields.some((field) => field.key === "bankAccount") && (
        <Select
          label="حساب تسویهٔ مرتبط"
          value={value.fields.bankAccount || ""}
          onChange={(v) => setField("bankAccount", v)}
          options={[
            { value: "", label: "بدون ارتباط" },
            ...banks.map((b) => ({ value: b.id, label: b.data.title })),
          ]}
        />
      )}
      {value.type === "digipay" && (
        <fieldset className="border border-teal-800 rounded-xl p-3 space-y-3">
          <legend className="font-bold px-2">Authorization Header</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            {template.fields
              .filter((f) =>
                ["client_id", "client_secret", "authorization"].includes(f.key),
              )
              .map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  value={value.fields[f.key]}
                  onChange={(v) => setField(f.key, v)}
                  secret
                />
              ))}
          </div>
          <p className="text-xs text-slate-400">
            از client_id و client_secret روی همین دستگاه ساخته می‌شود.
          </p>
          <button
            className={buttonClass}
            type="button"
            disabled={!value.fields.client_id || !value.fields.client_secret}
            onClick={() =>
              setField(
                "authorization",
                `Basic ${toBase64(new TextEncoder().encode(`${value.fields.client_id}:${value.fields.client_secret}`))}`,
              )
            }
          >
            ساخت Header نوع Basic
          </button>
        </fieldset>
      )}
      <fieldset className="space-y-2">
        <legend className="font-medium mb-2">پروژه‌های مرتبط</legend>
        {projects.map((p) => (
          <label key={p.id} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.projectIds.includes(p.id)}
              onChange={(e) =>
                onChange({
                  ...value,
                  projectIds: e.target.checked
                    ? [...value.projectIds, p.id]
                    : value.projectIds.filter((id) => id !== p.id),
                })
              }
            />
            {p.data.title}
            {p.archived_at && " (بایگانی)"}
          </label>
        ))}
      </fieldset>
      <div className="grid sm:grid-cols-2 gap-4">
        <DateField
          label="تاریخ تمدید"
          value={value.renewalDate}
          onChange={(renewalDate) => onChange({ ...value, renewalDate })}
        />
        <Field
          label="هزینهٔ پیشنهادی تمدید (تومان)"
          money
          value={value.renewalCost}
          onChange={(renewalCost) =>
            onChange({ ...value, renewalCost: digits(renewalCost) })
          }
        />
      </div>
      <p className="text-xs text-slate-400">
        یادآوری و هزینهٔ تمدید، بدهی خودکار ایجاد نمی‌کنند.
      </p>
      <fieldset className="space-y-3 border-t border-slate-700 pt-3">
        <legend>کدهای بازیابی</legend>
        {value.recoveryCodes.map((code, i) => (
          <div key={code.id} className="flex items-center gap-2">
            <div className="flex-1">
              <Field
                label={`کد ${i + 1}`}
                secret
                value={code.value}
                onChange={(v) =>
                  onChange({
                    ...value,
                    recoveryCodes: value.recoveryCodes.map((c) =>
                      c.id === code.id ? { ...c, value: v } : c,
                    ),
                  })
                }
              />
            </div>
            <label className="text-xs flex gap-1">
              <input
                type="checkbox"
                checked={code.used}
                onChange={(e) =>
                  onChange({
                    ...value,
                    recoveryCodes: value.recoveryCodes.map((c) =>
                      c.id === code.id ? { ...c, used: e.target.checked } : c,
                    ),
                  })
                }
              />
              استفاده‌شده
            </label>
          </div>
        ))}
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            onChange({
              ...value,
              recoveryCodes: [
                ...value.recoveryCodes,
                { id: crypto.randomUUID(), value: "", used: false },
              ],
            })
          }
        >
          افزودن کد
        </button>
      </fieldset>
      <fieldset className="space-y-3 border-t border-slate-700 pt-3">
        <legend>فیلدهای سفارشی</legend>
        {value.customFields.map((field) => (
          <div
            key={field.id}
            className="border border-slate-700 p-3 rounded-xl space-y-2"
          >
            <Field
              label="نام فیلد"
              value={field.label}
              onChange={(label) =>
                onChange({
                  ...value,
                  customFields: value.customFields.map((f) =>
                    f.id === field.id ? { ...f, label } : f,
                  ),
                })
              }
            />
            <Select
              label="نوع فیلد"
              value={field.type}
              onChange={(type) =>
                onChange({
                  ...value,
                  customFields: value.customFields.map((f) =>
                    f.id === field.id
                      ? { ...f, type: type as typeof f.type }
                      : f,
                  ),
                })
              }
              options={["text", "multiline", "url", "date", "secret"].map(
                (v, i) => ({
                  value: v,
                  label: ["متن", "چندخطی", "لینک", "تاریخ", "محرمانه"][i],
                }),
              )}
            />
            {field.type === "date" ? (
              <DateField
                label={field.label || "مقدار"}
                value={field.value}
                onChange={(v) =>
                  onChange({
                    ...value,
                    customFields: value.customFields.map((f) =>
                      f.id === field.id ? { ...f, value: v } : f,
                    ),
                  })
                }
              />
            ) : (
              <Field
                label={field.label || "مقدار"}
                value={field.value}
                secret={field.type === "secret"}
                multiline={field.type === "multiline"}
                onChange={(v) =>
                  onChange({
                    ...value,
                    customFields: value.customFields.map((f) =>
                      f.id === field.id ? { ...f, value: v } : f,
                    ),
                  })
                }
              />
            )}
          </div>
        ))}
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            onChange({
              ...value,
              customFields: [
                ...value.customFields,
                { id: crypto.randomUUID(), label: "", type: "text", value: "" },
              ],
            })
          }
        >
          افزودن فیلد سفارشی
        </button>
      </fieldset>
      <Field
        label="یادداشت"
        value={value.notes}
        multiline
        onChange={(notes) => onChange({ ...value, notes })}
      />
    </>
  );
}
export function LedgerFields({
  value,
  onChange,
  projects,
  projectId,
  onProject,
  banks,
}: {
  value: LedgerEntry;
  onChange: (x: LedgerEntry) => void;
  projects: Entity<Project>[];
  projectId: string;
  onProject: (id: string) => void;
  banks: Entity<ServiceRecord>[];
}) {
  const [local, setLocal] = useState(() => localTehranInput(value.occurredAt)),
    set = (k: keyof LedgerEntry, v: string) => onChange({ ...value, [k]: v });
  const updateTime = (date: string, time: string) => {
    setLocal({ date, time });
    set("occurredAt", tehranLocalToIso(date, time) || "");
  };
  return (
    <>
      <Select
        label="نوع عملیات"
        value={value.type}
        onChange={(v) => set("type", v)}
        options={LEDGER_OPTIONS}
      />
      <LedgerStatus entry={value} />
      <Field
        label="عنوان"
        required
        value={value.title}
        onChange={(v) => set("title", v)}
      />
      <Field
        label="مبلغ (تومان)"
        money
        required
        value={value.amount}
        onChange={(v) => set("amount", digits(v))}
      />
      {value.type === "opening" && (
        <Select
          label="جهت ماندهٔ اول دوره"
          value={value.openingDirection || "receivable"}
          onChange={(v) => set("openingDirection", v)}
          options={[
            { value: "receivable", label: "مشتری بدهکار است" },
            { value: "payable", label: "من بدهکارم / مشتری بستانکار است" },
          ]}
        />
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <DateField
          label="تاریخ ثبت"
          value={local.date}
          onChange={(v) => updateTime(v, local.time)}
        />
        <Field
          label="ساعت ایران"
          type="time"
          value={local.time}
          onChange={(v) => updateTime(local.date, v)}
        />
      </div>
      <Select
        label="روش دریافت یا پرداخت"
        value={value.method || ""}
        onChange={(v) => set("method", v)}
        options={[
          { value: "", label: "انتخاب کنید" },
          ...["کارت‌به‌کارت", "انتقال بانکی", "نقد", "چک", "درگاه", "سایر"].map(
            (v) => ({ value: v, label: v }),
          ),
        ]}
      />
      <Field
        label="شماره پیگیری / رسید"
        value={value.reference}
        onChange={(v) => set("reference", digits(v))}
      />
      <Select
        label="حساب مرتبط"
        value={value.bankRecordId || ""}
        onChange={(v) => set("bankRecordId", v)}
        options={[
          { value: "", label: "بدون ارتباط" },
          ...banks.map((b) => ({ value: b.id, label: b.data.title })),
        ]}
      />
      <Select
        label="پروژهٔ مرتبط (اختیاری)"
        value={projectId}
        onChange={onProject}
        options={[
          { value: "", label: "عمومی مشتری" },
          ...projects.map((p) => ({ value: p.id, label: p.data.title })),
        ]}
      />
      <Field
        label="توضیحات و مشخصات رسید"
        value={value.description}
        multiline
        onChange={(v) => set("description", v)}
      />
    </>
  );
}
export const initialData = (kind: EntityKind): Payloads[EntityKind] =>
  kind === "customer"
    ? {
        firstName: "",
        lastName: "",
        mobiles: [{ label: "", value: "" }],
        phones: [],
        emails: [],
      }
    : kind === "project"
      ? { title: "", type: "website", status: "active" }
      : kind === "record"
        ? {
            title: "",
            type: "github",
            fields: {},
            customFields: [],
            recoveryCodes: [],
            projectIds: [],
          }
        : kind === "ledger"
          ? {
              title: "",
              type: "expense",
              amount: "",
              occurredAt: new Date().toISOString(),
            }
          : { title: "", text: "" };
export function validatePayload(
  kind: EntityKind,
  value: Payloads[EntityKind],
): string | null {
  if (kind === "customer") {
    const c = value as Customer;
    if (c.birthDate === "invalid") return "تاریخ تولد معتبر وارد کنید.";
    return validateCustomer(c);
  }
  if (kind === "ledger") return validateLedger(value as LedgerEntry);
  if (!(value as Project).title?.trim()) return "عنوان الزامی است.";
  const p = value as Project,
    r = value as ServiceRecord;
  if (
    [
      p.startDate,
      p.dueDate,
      r.renewalDate,
      ...(r.customFields || [])
        .filter((f) => f.type === "date")
        .map((f) => f.value),
    ].includes("invalid")
  )
    return "تاریخ معتبر وارد کنید.";
  try {
    for (const n of [p.contractAmount, r.renewalCost]) if (n) amount(n);
  } catch (e) {
    return (e as Error).message;
  }
  return null;
}
