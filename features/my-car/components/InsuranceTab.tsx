import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  CalendarIcon,
  FileTextIcon,
} from '../../../components/Icons';
import JalaliDatePicker from '../../assets/components/JalaliDatePicker';
import { isImageRef, getObjectURLByRef } from '../../../lib/idb-images';
import type { VehicleInsurance, VehicleInsuranceType } from '../types';
import { formatDateLabel, fileToImageRef } from '../shared';

interface InsuranceTabProps {
  insurances: VehicleInsurance[];
  form: Partial<VehicleInsurance>;
  onChange: (f: Partial<VehicleInsurance>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onDelete: (id: string) => Promise<void>;
  onShowDetails: (ins: VehicleInsurance) => void;
}

export const InsuranceTab: React.FC<InsuranceTabProps> = ({
  insurances,
  form,
  onChange,
  onSubmit,
  onDelete,
  onShowDetails,
}) => (
  <div className="space-y-4">
    <form onSubmit={onSubmit} className="bg-slate-900/40 rounded-lg p-4 border border-slate-800 space-y-3">
      <h4 className="font-semibold text-slate-100 flex items-center gap-2">
        <PlusIcon />
        <span>افزودن / ویرایش بیمه</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <label className="block text-xs text-slate-400 mb-1">نوع بیمه</label>
          <select
            value={form.type || 'third_party'}
            onChange={(e) =>
              onChange({ ...form, type: e.target.value as VehicleInsuranceType })
            }
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
          >
            <option value="third_party">شخص ثالث</option>
            <option value="body">بیمه بدنه</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">شرکت بیمه</label>
          <input
            value={form.company || ''}
            onChange={(e) => onChange({ ...form, company: e.target.value })}
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
            placeholder="ایران، آسیا، دی، ..."
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">شماره بیمه‌نامه</label>
          <input
            value={form.policyNumber || ''}
            onChange={(e) => onChange({ ...form, policyNumber: e.target.value })}
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">تاریخ شروع</label>
          <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-md px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
            <div className="flex-1">
              <JalaliDatePicker
                id="vehicle-ins-start"
                value={form.startDate || new Date().toISOString()}
                onChange={(iso) =>
                  onChange({
                    ...form,
                    startDate: iso.slice(0, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">تاریخ پایان</label>
          <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-md px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
            <div className="flex-1">
              <JalaliDatePicker
                id="vehicle-ins-end"
                value={form.endDate || new Date().toISOString()}
                onChange={(iso) =>
                  onChange({
                    ...form,
                    endDate: iso.slice(0, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">درصد تخفیف</label>
          <input
            type="number"
            value={form.discountPercent ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                discountPercent: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
            placeholder="مثلاً ۷۰"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">مبلغ حق بیمه (تومان)</label>
          <input
            type="number"
            value={form.premiumAmount ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                premiumAmount: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">
            توضیحات پوشش‌ها (سرقت، آتش‌سوزی، سرنشین و ...)
          </label>
          <textarea
            rows={2}
            value={form.coverageDescription || ''}
            onChange={(e) =>
              onChange({ ...form, coverageDescription: e.target.value })
            }
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            فایل بیمه‌نامه (PDF / تصویر)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const ref = await fileToImageRef(file);
              onChange({ ...form, documentRef: ref });
            }}
            className="w-full text-xs text-slate-300"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-md transition"
        >
          <PlusIcon />
          <span>{form.id ? 'ذخیره بیمه' : 'افزودن بیمه'}</span>
        </button>
      </div>
    </form>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insurances.map((ins) => (
        <article
          key={ins.id}
          className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col space-y-2 cursor-pointer hover:border-sky-500/60 transition"
          onClick={() => onShowDetails(ins)}
        >
          <div className="flex items-center justify-between gap-2">
            <h5 className="font-semibold text-slate-100">
              {ins.type === 'third_party' ? 'بیمه شخص ثالث' : 'بیمه بدنه'}
            </h5>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({
                    id: ins.id,
                    vehicleId: ins.vehicleId,
                    type: ins.type,
                    company: ins.company,
                    policyNumber: ins.policyNumber,
                    startDate: ins.startDate,
                    endDate: ins.endDate,
                    discountPercent: ins.discountPercent,
                    premiumAmount: ins.premiumAmount,
                    coverageDescription: ins.coverageDescription,
                    documentRef: ins.documentRef,
                  });
                }}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                aria-label="ویرایش بیمه"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(ins.id);
                }}
                className="p-1 rounded-full hover:bg-slate-800 text-rose-400"
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {ins.company || '-'} {ins.policyNumber && ` | شماره: ${ins.policyNumber}`}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {formatDateLabel(ins.startDate)} تا {formatDateLabel(ins.endDate)}
            </span>
          </p>
          <p className="text-xs text-slate-400">
            تخفیف: {ins.discountPercent != null ? `${ins.discountPercent}%` : '-'}
          </p>
          <p className="text-xs text-slate-400">
            مبلغ حق بیمه: {ins.premiumAmount != null ? `${ins.premiumAmount.toLocaleString()} تومان` : '-'}
          </p>
          {ins.coverageDescription && (
            <p className="text-xs text-slate-300 border-t border-slate-800/60 pt-2 mt-2">
              {ins.coverageDescription}
            </p>
          )}
          {ins.documentRef && (
            <InsuranceDocumentLink documentRef={ins.documentRef} />
          )}
        </article>
      ))}
      {insurances.length === 0 && (
        <p className="text-sm text-slate-400">
          هنوز هیچ بیمه‌ای برای این خودرو ثبت نشده است.
        </p>
      )}
    </div>
  </div>
);

export const InsuranceDocumentLink: React.FC<{ documentRef: string }> = ({ documentRef }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      if (documentRef && isImageRef(documentRef)) {
        const u = await getObjectURLByRef(documentRef);
        if (u) {
          setUrl(u);
          revoke = u;
        }
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [documentRef]);

  if (!documentRef) return null;
  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 text-xs mt-1 ${
        url ? 'text-sky-400 hover:text-sky-300' : 'text-slate-500 cursor-default'
      }`}
    >
      <FileTextIcon />
      <span>مشاهده بیمه‌نامه</span>
    </a>
  );
};
