import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Wallet, SlidersHorizontal } from 'lucide-react';
import type { VehicleExpense } from '../types';
import { formatJalali, formatToman, totalExpenses } from '../vehicle-status';
import {
  Sheet,
  SheetActions,
  Field,
  TextInput,
  TextArea,
  DateField,
  AttachmentField,
  DocumentLink,
  Chip,
  EmptyState,
  IconButton,
} from './ui';
import { BASE_EXPENSE_CATEGORIES, todayIsoDateOnly } from '../shared';
import { toast } from '../../../lib/toast';

type Preset = 'all' | 'this_month' | 'last_3' | 'last_6' | 'last_12' | 'custom';

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'this_month', label: 'این ماه' },
  { id: 'last_3', label: '۳ ماه' },
  { id: 'last_6', label: '۶ ماه' },
  { id: 'last_12', label: 'یک سال' },
];

interface Props {
  records: VehicleExpense[];
  vehicleId: string;
  onSave: (payload: Omit<VehicleExpense, 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => void;
  onShowDetails: (exp: VehicleExpense) => void;
}

const FORM_ID = 'my-car-expense-form';

export const ExpensesTab: React.FC<Props> = ({
  records,
  vehicleId,
  onSave,
  onDelete,
  onShowDetails,
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<VehicleExpense>>({ date: todayIsoDateOnly(), category: '' });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>('all');
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();
  const [filterCats, setFilterCats] = useState<string[]>([]);

  const allCategories = useMemo(
    () => Array.from(new Set<string>([...BASE_EXPENSE_CATEGORIES, ...records.map((r) => r.category)])),
    [records]
  );

  const applyPreset = (p: Exclude<Preset, 'custom'>) => {
    setPreset(p);
    const today = new Date();
    let s: Date | undefined;
    let e: Date | undefined = today;
    switch (p) {
      case 'all':
        s = undefined;
        e = undefined;
        break;
      case 'this_month':
        s = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_3':
        s = new Date(today);
        s.setMonth(s.getMonth() - 3);
        break;
      case 'last_6':
        s = new Date(today);
        s.setMonth(s.getMonth() - 6);
        break;
      case 'last_12':
        s = new Date(today);
        s.setFullYear(s.getFullYear() - 1);
        break;
    }
    setStart(s ? s.toISOString().slice(0, 10) : undefined);
    setEnd(e ? e.toISOString().slice(0, 10) : undefined);
  };

  const toggleFilterCat = (label: string) =>
    setFilterCats((prev) => (prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]));

  const visible = useMemo(() => {
    return records.filter((r) => {
      if (start && r.date < start) return false;
      if (end && r.date > end) return false;
      if (filterCats.length && !filterCats.includes(r.category)) return false;
      return true;
    });
  }, [records, start, end, filterCats]);

  const total = useMemo(() => totalExpenses(visible), [visible]);

  const openAdd = () => {
    setForm({ date: todayIsoDateOnly(), category: '' });
    setOpen(true);
  };
  const openEdit = (r: VehicleExpense) => {
    setForm({ ...r });
    setOpen(true);
  };

  const patch = (p: Partial<VehicleExpense>) => setForm((prev) => ({ ...prev, ...p }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = form.amount != null && !Number.isNaN(form.amount) ? Number(form.amount) : NaN;
    if (Number.isNaN(amount)) {
      toast.warning('لطفاً مبلغ را به‌صورت عدد وارد کنید (صفر هم مجاز است).');
      return;
    }
    const category = (form.category || '').trim();
    if (!category) {
      toast.warning('لطفاً بابت هزینه را مشخص کنید.');
      return;
    }
    await onSave({
      id: form.id || '',
      vehicleId,
      date: form.date && form.date.length >= 10 ? form.date.slice(0, 10) : todayIsoDateOnly(),
      amount,
      category,
      description: form.description,
      attachmentRef: form.attachmentRef,
      maintenanceId: form.maintenanceId,
    });
    setOpen(false);
  };

  const customCategoryValue =
    form.category && !BASE_EXPENSE_CATEGORIES.includes(form.category) ? form.category : '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-200">هزینه‌ها</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ring-1 transition ${
              filtersOpen ? 'bg-brand-500/15 ring-brand-500/30 text-brand-200' : 'bg-white/[0.05] ring-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>فیلتر</span>
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3 py-2 transition"
          >
            <Plus size={15} />
            <span>افزودن هزینه</span>
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] p-3.5 flex items-center justify-between">
        <span className="text-xs text-slate-400">جمع کل نمایش‌داده‌شده</span>
        <span className="text-base font-bold text-amber-300 nums-tabular">{formatToman(total)}</span>
      </div>

      {/* Filters */}
      {filtersOpen && (
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3.5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Chip key={p.id} active={preset === p.id} onClick={() => applyPreset(p.id)}>
                {p.label}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="از تاریخ"
              id="exp-filter-from"
              value={start || new Date().toISOString()}
              onChange={(iso) => {
                setPreset('custom');
                setStart(iso.slice(0, 10));
              }}
            />
            <DateField
              label="تا تاریخ"
              id="exp-filter-to"
              value={end || new Date().toISOString()}
              onChange={(iso) => {
                setPreset('custom');
                setEnd(iso.slice(0, 10));
              }}
            />
          </div>
          {allCategories.length > 0 && (
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">دسته‌بندی‌ها</p>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((label) => (
                  <Chip key={label} active={filterCats.includes(label)} onClick={() => toggleFilterCat(label)} tone="emerald">
                    {label}
                  </Chip>
                ))}
                {filterCats.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterCats([])}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs text-slate-300 hover:bg-white/[0.08] transition"
                  >
                    پاک‌سازی
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <EmptyState icon={<Wallet size={30} />}>
          {records.length === 0
            ? 'هنوز هزینه‌ای برای این خودرو ثبت نشده است.'
            : 'هیچ هزینه‌ای مطابق فیلتر فعلی پیدا نشد.'}
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {visible.map((r) => (
            <article
              key={r.id}
              onClick={() => onShowDetails(r)}
              className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] p-3.5 hover:bg-white/[0.06] transition cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/12 text-amber-300 flex items-center justify-center shrink-0">
                    <Wallet size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-100 truncate">{r.category}</p>
                    <p className="text-[11px] text-slate-400 nums-tabular">{formatJalali(r.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-amber-300 nums-tabular">{formatToman(r.amount)}</span>
                  <IconButton
                    label="ویرایش هزینه"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(r);
                    }}
                  >
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton
                    label="حذف هزینه"
                    tone="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(r.id);
                    }}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
              {r.description && (
                <p className="mt-2.5 pt-2.5 border-t border-white/[0.06] text-[11px] text-slate-300 leading-6">{r.description}</p>
              )}
              {r.attachmentRef && (
                <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                  <DocumentLink documentRef={r.attachmentRef} label="مشاهده رسید" />
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'ویرایش هزینه' : 'ثبت هزینه خودرو'}
        subtitle="مبلغ، تاریخ و بابت هزینه را وارد کنید."
        icon={<Wallet size={20} />}
        footer={
          <SheetActions formId={FORM_ID} onCancel={() => setOpen(false)} submitLabel={form.id ? 'ذخیره تغییرات' : 'ثبت هزینه'} />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <Field label="مبلغ (تومان)" required>
            <TextInput
              type="number"
              min={0}
              value={form.amount ?? ''}
              onChange={(e) => patch({ amount: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <div className="col-span-1">
            <DateField label="تاریخ" id="exp-date" value={form.date} onChange={(iso) => patch({ date: iso.slice(0, 10) })} required />
          </div>
          <Field label="بابت" required className="col-span-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {allCategories.map((label) => (
                <Chip key={label} active={form.category === label} onClick={() => patch({ category: label })}>
                  {label}
                </Chip>
              ))}
            </div>
            <TextInput
              placeholder="بابت دلخواه (مثلاً عوارض، کارواش)"
              value={customCategoryValue}
              onChange={(e) => patch({ category: e.target.value })}
            />
          </Field>
          <Field label="توضیحات" className="col-span-2">
            <TextArea value={form.description || ''} onChange={(e) => patch({ description: e.target.value })} rows={2} />
          </Field>
          <div className="col-span-2">
            <AttachmentField label="رسید هزینه (PDF / تصویر)" value={form.attachmentRef} onChange={(ref) => patch({ attachmentRef: ref })} />
          </div>
        </form>
      </Sheet>
    </div>
  );
};
