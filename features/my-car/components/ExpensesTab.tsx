import React, { useState, useMemo } from 'react';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  CalendarIcon,
} from '../../../components/Icons';
import JalaliDatePicker from '../../assets/components/JalaliDatePicker';
import type { VehicleExpense } from '../types';
import { formatDateLabel, fileToImageRef, BASE_EXPENSE_CATEGORIES } from '../shared';
import { InsuranceDocumentLink } from './InsuranceTab';

interface ExpensesTabProps {
  records: VehicleExpense[];
  form: Partial<VehicleExpense>;
  onChange: (f: Partial<VehicleExpense>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onDelete: (id: string) => Promise<void>;
  onShowDetails: (exp: VehicleExpense) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  records,
  form,
  onChange,
  onSubmit,
  onDelete,
  onShowDetails,
}) => {
  const allCategories = useMemo(
    () =>
      Array.from(
        new Set<string>([
          ...BASE_EXPENSE_CATEGORIES,
          ...(records.map((r) => r.category) || []),
        ])
      ),
    [records]
  );

  const [filterPreset, setFilterPreset] = useState<
    'all' | 'this_month' | 'last_3' | 'last_6' | 'last_12' | 'custom'
  >('all');
  const [filterStart, setFilterStart] = useState<string | undefined>();
  const [filterEnd, setFilterEnd] = useState<string | undefined>();
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSelectCategory = (label: string) => {
    onChange({ category: label });
  };

  const handleToggleFilterCategory = (label: string) => {
    setFilterCategories((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );
  };

  const applyPreset = (preset: 'all' | 'this_month' | 'last_3' | 'last_6' | 'last_12') => {
    setFilterPreset(preset);
    const today = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    switch (preset) {
      case 'all':
        start = undefined;
        end = undefined;
        break;
      case 'this_month': {
        const d = new Date(today);
        start = new Date(d.getFullYear(), d.getMonth(), 1);
        end = today;
        break;
      }
      case 'last_3': {
        end = today;
        start = new Date(today);
        start.setMonth(start.getMonth() - 3);
        break;
      }
      case 'last_6': {
        end = today;
        start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        break;
      }
      case 'last_12': {
        end = today;
        start = new Date(today);
        start.setFullYear(start.getFullYear() - 1);
        break;
      }
    }

    setFilterStart(start ? start.toISOString().slice(0, 10) : undefined);
    setFilterEnd(end ? end.toISOString().slice(0, 10) : undefined);
  };

  const visibleRecords = useMemo(() => {
    return records.filter((r) => {
      const d = new Date(r.date);
      if (filterStart) {
        const s = new Date(filterStart);
        if (d < s) return false;
      }
      if (filterEnd) {
        const e = new Date(filterEnd);
        if (d > e) return false;
      }
      if (filterCategories.length > 0 && !filterCategories.includes(r.category)) {
        return false;
      }
      return true;
    });
  }, [records, filterStart, filterEnd, filterCategories]);

  const totalAmount = useMemo(
    () => visibleRecords.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [visibleRecords]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">گزارش مخارج خودرو</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            جمع کل هزینه‌های نمایش‌داده‌شده و امکان فیلتر پیشرفته.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-600 bg-slate-900/60 text-[11px] text-slate-200 hover:border-sky-400 hover:text-sky-200 transition"
        >
          <span>{filtersOpen ? 'بستن فیلترها' : 'نمایش فیلترها'}</span>
        </button>
      </div>

      {filtersOpen && (
        <div className="bg-slate-900/40 rounded-lg p-4 border border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h5 className="text-xs font-semibold text-slate-100">فیلتر مخارج خودرو</h5>
              <p className="text-[11px] text-slate-400 mt-1">
                بازه زمانی و دسته‌بندی‌های مورد نظر خود را برای گزارش‌گیری انتخاب کنید.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className={`px-3 py-1.5 rounded-full border transition ${
                  filterPreset === 'all'
                    ? 'bg-sky-500/10 border-sky-400 text-sky-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                همه
              </button>
              <button
                type="button"
                onClick={() => applyPreset('this_month')}
                className={`px-3 py-1.5 rounded-full border transition ${
                  filterPreset === 'this_month'
                    ? 'bg-sky-500/10 border-sky-400 text-sky-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                ماه جاری
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_3')}
                className={`px-3 py-1.5 rounded-full border transition ${
                  filterPreset === 'last_3'
                    ? 'bg-sky-500/10 border-sky-400 text-sky-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                ۳ ماه گذشته
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_6')}
                className={`px-3 py-1.5 rounded-full border transition ${
                  filterPreset === 'last_6'
                    ? 'bg-sky-500/10 border-sky-400 text-sky-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                ۶ ماه گذشته
              </button>
              <button
                type="button"
                onClick={() => applyPreset('last_12')}
                className={`px-3 py-1.5 rounded-full border transition ${
                  filterPreset === 'last_12'
                    ? 'bg-sky-500/10 border-sky-400 text-sky-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-400'
                }`}
              >
                یک سال گذشته
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">از تاریخ</label>
              <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-md px-3 py-1.5">
                <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
                <div className="flex-1">
                  <JalaliDatePicker
                    id="vehicle-expense-filter-from"
                    value={filterStart || new Date(0).toISOString()}
                    onChange={(iso) => {
                      setFilterPreset('custom');
                      setFilterStart(iso.slice(0, 10));
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">تا تاریخ</label>
              <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-md px-3 py-1.5">
                <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
                <div className="flex-1">
                  <JalaliDatePicker
                    id="vehicle-expense-filter-to"
                    value={filterEnd || new Date().toISOString()}
                    onChange={(iso) => {
                      setFilterPreset('custom');
                      setFilterEnd(iso.slice(0, 10));
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">دسته‌بندی‌ها</label>
              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((label) => {
                  const active = filterCategories.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleToggleFilterCategory(label)}
                      className={`px-2.5 py-1 rounded-full border text-[11px] transition ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-400 text-emerald-200'
                          : 'border-slate-600 text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                {filterCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterCategories([])}
                    className="px-2.5 py-1 rounded-full border border-slate-600 text-[11px] text-slate-300 hover:border-slate-400"
                  >
                    پاک‌سازی
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="bg-slate-900/40 rounded-lg p-4 border border-slate-800 space-y-3"
      >
        <h4 className="font-semibold text-slate-100 flex items-center gap-2">
          <PlusIcon />
          <span>ثبت هزینه / مخارج خودرو</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              مبلغ (تومان) *
            </label>
            <input
              type="number"
              value={form.amount ?? ''}
              min={0}
              onChange={(e) =>
                onChange({
                  amount: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              تاریخ هزینه *
            </label>
            <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-md px-3 py-1.5">
              <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
              <div className="flex-1">
                <JalaliDatePicker
                  id="vehicle-expense-date"
                  value={form.date || new Date().toISOString()}
                  onChange={(iso) =>
                  onChange({
                    date: iso.slice(0, 10),
                  })
                  }
                />
              </div>
            </div>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs text-slate-400 mb-1">
              بابت *
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {allCategories.map((label) => {
                const selected = form.category === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSelectCategory(label)}
                    className={`px-3 py-1.5 rounded-full border text-xs transition ${
                      selected
                        ? 'border-sky-400 bg-sky-500/10 text-sky-200'
                        : 'border-slate-600 bg-slate-900/40 text-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="بابت دلخواه (مثلاً عوارض، شستشو)"
              value={
                form.category &&
                !BASE_EXPENSE_CATEGORIES.includes(form.category)
                  ? form.category
                  : ''
              }
              onChange={(e) =>
                onChange({
                  category: e.target.value,
                })
              }
              className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100 mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">
              توضیحات
            </label>
            <textarea
              rows={2}
              value={form.description || ''}
              onChange={(e) =>
                onChange({ description: e.target.value })
              }
              className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              رسید هزینه (PDF / تصویر)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const ref = await fileToImageRef(file);
                onChange({ attachmentRef: ref });
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
            <span>{form.id ? 'ذخیره هزینه' : 'ثبت هزینه'}</span>
          </button>
        </div>
      </form>

      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800 flex items-center justify-between text-xs sm:text-sm">
        <span className="text-slate-300">جمع کل هزینه‌های نمایش‌داده‌شده</span>
        <span className="font-semibold text-emerald-300">
          {totalAmount.toLocaleString()} تومان
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleRecords.map((r) => (
          <article
            key={r.id}
            className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col space-y-2 cursor-pointer hover:border-sky-500/60 transition"
            onClick={() => onShowDetails(r)}
          >
            <div className="flex items-center justify-between gap-2">
              <h5 className="font-semibold text-slate-100">
                {r.category} - {r.amount.toLocaleString()} تومان
              </h5>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({
                      id: r.id,
                      vehicleId: r.vehicleId,
                      date: r.date,
                      amount: r.amount,
                      category: r.category,
                      description: r.description,
                      attachmentRef: r.attachmentRef,
                      maintenanceId: r.maintenanceId,
                      createdAt: r.createdAt,
                    });
                  }}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                  aria-label="ویرایش هزینه"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(r.id);
                  }}
                  className="p-1 rounded-full hover:bg-slate-800 text-rose-400"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              تاریخ: {formatDateLabel(r.date)}
            </p>
            {r.description && (
              <p className="text-xs text-slate-300 border-t border-slate-800/60 pt-2 mt-2">
                {r.description}
              </p>
            )}
            {r.attachmentRef && (
              <InsuranceDocumentLink documentRef={r.attachmentRef} />
            )}
          </article>
        ))}
        {visibleRecords.length === 0 && (
          <p className="text-sm text-slate-400">
            هیچ هزینه‌ای مطابق فیلتر فعلی پیدا نشد.
          </p>
        )}
      </div>
    </div>
  );
};
