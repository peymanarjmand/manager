import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Wrench, BellRing } from 'lucide-react';
import type { VehicleMaintenanceRecord } from '../types';
import {
  computeServiceStatus,
  daysUntil,
  formatJalali,
  formatNum,
  formatToman,
} from '../vehicle-status';
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
import { BASE_SERVICE_ITEMS, todayIsoDateOnly } from '../shared';
import { toast } from '../../../lib/toast';

interface Props {
  records: VehicleMaintenanceRecord[];
  vehicleId: string;
  onSave: (payload: Omit<VehicleMaintenanceRecord, 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => void;
  onShowDetails: (rec: VehicleMaintenanceRecord) => void;
}

const FORM_ID = 'my-car-maintenance-form';

export const MaintenanceTab: React.FC<Props> = ({
  records,
  vehicleId,
  onSave,
  onDelete,
  onShowDetails,
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<VehicleMaintenanceRecord>>({});
  const [customItem, setCustomItem] = useState('');

  const svc = computeServiceStatus(records);
  const items = form.items || [];

  const openAdd = () => {
    setForm({ serviceDate: todayIsoDateOnly(), items: [] });
    setCustomItem('');
    setOpen(true);
  };
  const openEdit = (r: VehicleMaintenanceRecord) => {
    setForm({ ...r, items: r.items || [] });
    setCustomItem('');
    setOpen(true);
  };

  const patch = (p: Partial<VehicleMaintenanceRecord>) => setForm((prev) => ({ ...prev, ...p }));

  const toggleItem = (label: string) => {
    const next = items.includes(label) ? items.filter((i) => i !== label) : [...items, label];
    patch({ items: next });
  };
  const addCustomItem = () => {
    const t = customItem.trim();
    if (!t) return;
    if (!items.includes(t)) patch({ items: [...items, t] });
    setCustomItem('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length) {
      toast.warning('حداقل یک مورد سرویس را انتخاب کنید.');
      return;
    }
    if (form.odometerKm == null || Number.isNaN(form.odometerKm)) {
      toast.warning('لطفاً کیلومتر فعلی را وارد کنید.');
      return;
    }
    if (form.cost == null || Number.isNaN(form.cost)) {
      toast.warning('لطفاً مبلغ سرویس را وارد کنید (صفر هم مجاز است).');
      return;
    }
    await onSave({
      id: form.id || '',
      vehicleId,
      serviceDate: form.serviceDate || todayIsoDateOnly(),
      odometerKm: form.odometerKm,
      nextOdometerKm: form.nextOdometerKm,
      itemsDescription: form.itemsDescription || items.join('، '),
      items,
      nextServiceDate: form.nextServiceDate,
      cost: form.cost,
      notes: form.notes,
      invoiceRef: form.invoiceRef,
    });
    setOpen(false);
  };

  const customItems = items.filter((it) => !BASE_SERVICE_ITEMS.includes(it));

  return (
    <div className="space-y-3">
      {/* Smart reminder */}
      {(svc.overdue || svc.dueSoon) && svc.nextDate && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl p-3 ring-1 ${
            svc.overdue
              ? 'bg-rose-500/10 ring-rose-500/20 text-rose-200'
              : 'bg-amber-500/10 ring-amber-500/20 text-amber-200'
          }`}
        >
          <BellRing size={18} className="shrink-0" />
          <p className="text-xs leading-6">
            {svc.overdue ? 'موعد سرویس بعدی گذشته است' : 'سرویس بعدی نزدیک است'} —{' '}
            <span className="font-bold nums-tabular">{formatJalali(svc.nextDate)}</span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-200">سرویس‌ها و سوابق فنی</h4>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-3 py-2 transition"
        >
          <Plus size={15} />
          <span>ثبت سرویس</span>
        </button>
      </div>

      {records.length === 0 ? (
        <EmptyState icon={<Wrench size={30} />}>
          هنوز سرویسی برای این خودرو ثبت نشده است. با دکمه «ثبت سرویس» اولین سابقه فنی را وارد کنید.
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => {
            const overdue = r.nextServiceDate ? daysUntil(r.nextServiceDate) < 0 : false;
            return (
              <article
                key={r.id}
                onClick={() => onShowDetails(r)}
                className="rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06] p-3.5 hover:bg-white/[0.06] transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-brand-500/12 text-brand-300 flex items-center justify-center shrink-0">
                      <Wrench size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-100 nums-tabular">سرویس {formatJalali(r.serviceDate)}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {r.items?.length ? r.items.join('، ') : r.itemsDescription}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton
                      label="ویرایش سرویس"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(r);
                      }}
                    >
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      label="حذف سرویس"
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

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <span className="text-slate-400">
                    کیلومتر: <span className="text-slate-200 nums-tabular">{r.odometerKm != null ? formatNum(r.odometerKm) : '—'}</span>
                  </span>
                  <span className="text-slate-400 text-left">
                    هزینه: <span className="text-slate-200 nums-tabular">{r.cost != null ? formatToman(r.cost) : '—'}</span>
                  </span>
                </div>

                {r.nextServiceDate && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
                    <span
                      className={`text-[11px] font-medium px-2 py-1 rounded-lg nums-tabular ${
                        overdue ? 'bg-rose-500/12 text-rose-300' : 'bg-emerald-500/12 text-emerald-300'
                      }`}
                    >
                      سرویس بعدی: {formatJalali(r.nextServiceDate)} {overdue && '(گذشته)'}
                    </span>
                  </div>
                )}

                {r.invoiceRef && (
                  <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                    <DocumentLink documentRef={r.invoiceRef} label="مشاهده فاکتور" />
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
        title={form.id ? 'ویرایش سرویس' : 'ثبت سرویس / تعویض روغن'}
        subtitle="موارد انجام‌شده، کیلومتر و هزینه سرویس را وارد کنید."
        icon={<Wrench size={20} />}
        footer={
          <SheetActions formId={FORM_ID} onCancel={() => setOpen(false)} submitLabel={form.id ? 'ذخیره تغییرات' : 'ثبت سرویس'} />
        }
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <DateField label="تاریخ سرویس" id="svc-date" value={form.serviceDate} onChange={(iso) => patch({ serviceDate: iso.slice(0, 10) })} required />
          </div>
          <Field label="کیلومتر فعلی" required>
            <TextInput
              type="number"
              min={0}
              value={form.odometerKm ?? ''}
              onChange={(e) => patch({ odometerKm: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="مثلاً ۱۲۳۰۰۰"
            />
          </Field>
          <Field label="کیلومتر سرویس بعدی">
            <TextInput
              type="number"
              min={0}
              value={form.nextOdometerKm ?? ''}
              onChange={(e) => patch({ nextOdometerKm: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>

          <Field label="موارد انجام‌شده" required className="col-span-2">
            <div className="flex flex-wrap gap-2 mb-2">
              {BASE_SERVICE_ITEMS.map((label) => (
                <Chip key={label} active={items.includes(label)} onClick={() => toggleItem(label)} tone="emerald">
                  {label}
                </Chip>
              ))}
              {customItems.map((label) => (
                <Chip key={label} active onClick={() => toggleItem(label)}>
                  {label}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomItem();
                  }
                }}
                placeholder="افزودن مورد دلخواه (مثلاً تعویض لنت جلو)"
              />
              <button
                type="button"
                onClick={addCustomItem}
                className="shrink-0 w-11 rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center transition"
                aria-label="افزودن مورد"
              >
                <Plus size={18} />
              </button>
            </div>
          </Field>

          <div className="col-span-2 flex items-center justify-between rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] px-3.5 py-2.5">
            <span className="text-xs font-medium text-slate-300">یادآوری سرویس بعدی</span>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-400">
              <input
                type="checkbox"
                className="accent-brand-500 w-4 h-4"
                checked={!!form.nextServiceDate}
                onChange={(e) => patch({ nextServiceDate: e.target.checked ? todayIsoDateOnly() : undefined })}
              />
              <span>فعال</span>
            </label>
          </div>
          {form.nextServiceDate && (
            <div className="col-span-2">
              <DateField label="تاریخ پیشنهادی سرویس بعدی" id="svc-next" value={form.nextServiceDate} onChange={(iso) => patch({ nextServiceDate: iso.slice(0, 10) })} />
            </div>
          )}

          <Field label="مبلغ کل سرویس (تومان)" required className="col-span-2">
            <TextInput
              type="number"
              min={0}
              value={form.cost ?? ''}
              onChange={(e) => patch({ cost: e.target.value ? Number(e.target.value) : undefined })}
            />
          </Field>
          <Field label="یادداشت / توضیحات" className="col-span-2">
            <TextArea value={form.notes || ''} onChange={(e) => patch({ notes: e.target.value })} rows={2} />
          </Field>
          <div className="col-span-2">
            <AttachmentField label="فاکتور سرویس (PDF / تصویر)" value={form.invoiceRef} onChange={(ref) => patch({ invoiceRef: ref })} />
          </div>
        </form>
      </Sheet>
    </div>
  );
};
