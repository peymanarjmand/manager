import React, { useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import type { VehicleInsurance, VehicleInsuranceType } from '../types';
import { computeInsuranceStatus, formatJalali, formatToman, type StatusTone } from '../vehicle-status';
import {
  Sheet,
  SheetActions,
  Field,
  TextInput,
  TextArea,
  Select,
  DateField,
  AttachmentField,
  DocumentLink,
  EmptyState,
  IconButton,
} from './ui';
import { todayIsoDateOnly } from '../shared';

const CHIP: Record<StatusTone, string> = {
  emerald: 'bg-emerald-500/12 text-emerald-300',
  amber: 'bg-amber-500/12 text-amber-300',
  rose: 'bg-rose-500/12 text-rose-300',
  brand: 'bg-brand-500/12 text-brand-300',
  slate: 'bg-white/[0.06] text-slate-300',
};

const typeLabel = (t: VehicleInsuranceType) => (t === 'third_party' ? 'بیمه شخص ثالث' : 'بیمه بدنه');

interface Props {
  insurances: VehicleInsurance[];
  vehicleId: string;
  onSave: (payload: Omit<VehicleInsurance, 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => void;
  onShowDetails: (ins: VehicleInsurance) => void;
}

const FORM_ID = 'my-car-insurance-form';

export const InsuranceTab: React.FC<Props> = ({
  insurances,
  vehicleId,
  onSave,
  onDelete,
  onShowDetails,
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<VehicleInsurance>>({ type: 'third_party' });

  const openAdd = () => {
    setForm({ type: 'third_party', startDate: todayIsoDateOnly(), endDate: todayIsoDateOnly() });
    setOpen(true);
  };
  const openEdit = (ins: VehicleInsurance) => {
    setForm({ ...ins });
    setOpen(true);
  };

  const patch = (p: Partial<VehicleInsurance>) => setForm((prev) => ({ ...prev, ...p }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) return;
    await onSave({
      id: form.id || '',
      vehicleId,
      type: (form.type as VehicleInsuranceType) || 'third_party',
      company: form.company,
      policyNumber: form.policyNumber,
      startDate: form.startDate,
      endDate: form.endDate,
      discountPercent: form.discountPercent,
      premiumAmount: form.premiumAmount,
      coverageDescription: form.coverageDescription,
      documentRef: form.documentRef,
    });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-200">بیمه‌نامه‌ها</h4>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3 py-2 transition"
        >
          <Plus size={15} />
          <span>افزودن بیمه</span>
        </button>
      </div>

      {insurances.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={30} />}>
          هنوز بیمه‌ای برای این خودرو ثبت نشده است. با دکمه «افزودن بیمه» اولین بیمه‌نامه را وارد کنید.
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {insurances.map((ins) => {
            const st = computeInsuranceStatus([ins]);
            return (
              <article
                key={ins.id}
                onClick={() => onShowDetails(ins)}
                className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] p-3.5 hover:bg-white/[0.06] transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${CHIP[st.tone]}`}>
                      <ShieldCheck size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-100">{typeLabel(ins.type)}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {[ins.company, ins.policyNumber].filter(Boolean).join(' · ') || 'بدون مشخصات'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton
                      label="ویرایش بیمه"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(ins);
                      }}
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      label="حذف بیمه"
                      tone="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(ins.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${CHIP[st.tone]}`}>{st.label}</span>
                  <span className="text-[11px] text-slate-400 nums-tabular" dir="ltr">
                    {formatJalali(ins.startDate)} – {formatJalali(ins.endDate)}
                  </span>
                </div>

                {(ins.premiumAmount != null || ins.discountPercent != null) && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400">
                      حق بیمه:{' '}
                      <span className="text-slate-200 nums-tabular">
                        {ins.premiumAmount != null ? formatToman(ins.premiumAmount) : '—'}
                      </span>
                    </span>
                    {ins.discountPercent != null && (
                      <span className="text-slate-400 nums-tabular">تخفیف {ins.discountPercent}٪</span>
                    )}
                  </div>
                )}

                {ins.documentRef && (
                  <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                    <DocumentLink documentRef={ins.documentRef} label="مشاهده بیمه‌نامه" />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'ویرایش بیمه‌نامه' : 'افزودن بیمه‌نامه'}
        subtitle="اطلاعات بیمه‌نامه خودرو را وارد کنید."
        icon={<ShieldCheck size={20} />}
        footer={
          <SheetActions formId={FORM_ID} onCancel={() => setOpen(false)} submitLabel={form.id ? 'ذخیره تغییرات' : 'افزودن بیمه'} />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <Field label="نوع بیمه" required>
            <Select value={form.type || 'third_party'} onChange={(e) => patch({ type: e.target.value as VehicleInsuranceType })}>
              <option value="third_party">شخص ثالث</option>
              <option value="body">بدنه</option>
            </Select>
          </Field>
          <Field label="شرکت بیمه">
            <TextInput value={form.company || ''} onChange={(e) => patch({ company: e.target.value })} placeholder="ایران، آسیا، دی…" />
          </Field>
          <Field label="شماره بیمه‌نامه" className="col-span-2">
            <TextInput value={form.policyNumber || ''} onChange={(e) => patch({ policyNumber: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <DateField label="تاریخ شروع" id="ins-start" value={form.startDate} onChange={(iso) => patch({ startDate: iso.slice(0, 10) })} required />
          </div>
          <div className="col-span-2">
            <DateField label="تاریخ پایان" id="ins-end" value={form.endDate} onChange={(iso) => patch({ endDate: iso.slice(0, 10) })} required />
          </div>
          <Field label="درصد تخفیف">
            <TextInput
              type="number"
              min={0}
              value={form.discountPercent ?? ''}
              onChange={(e) => patch({ discountPercent: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="مثلاً ۷۰"
            />
          </Field>
          <Field label="حق بیمه (تومان)">
            <TextInput
              type="number"
              min={0}
              value={form.premiumAmount ?? ''}
              onChange={(e) => patch({ premiumAmount: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="پوشش‌ها (سرقت، آتش‌سوزی، سرنشین…)" className="col-span-2">
            <TextArea value={form.coverageDescription || ''} onChange={(e) => patch({ coverageDescription: e.target.value })} rows={2} />
          </Field>
          <div className="col-span-2">
            <AttachmentField label="فایل بیمه‌نامه (PDF / تصویر)" value={form.documentRef} onChange={(ref) => patch({ documentRef: ref })} />
          </div>
        </form>
      </Sheet>
    </div>
  );
};
