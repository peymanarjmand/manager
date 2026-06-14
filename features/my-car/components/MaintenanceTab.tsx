import React, { useState } from 'react';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  CalendarIcon,
} from '../../../components/Icons';
import JalaliDatePicker from '../../assets/components/JalaliDatePicker';
import type { VehicleMaintenanceRecord } from '../types';
import { formatDateLabel, fileToImageRef, todayIsoDateOnly, BASE_SERVICE_ITEMS } from '../shared';
import { InsuranceDocumentLink } from './InsuranceTab';

interface MaintenanceTabProps {
  records: VehicleMaintenanceRecord[];
  form: Partial<VehicleMaintenanceRecord>;
  onChange: (f: Partial<VehicleMaintenanceRecord>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onDelete: (id: string) => Promise<void>;
  onShowDetails: (rec: VehicleMaintenanceRecord) => void;
}

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({
  records,
  form,
  onChange,
  onSubmit,
  onDelete,
  onShowDetails,
}) => {
  const [customItem, setCustomItem] = useState('');
  const items = form.items || [];

  const toggleItem = (label: string) => {
    const exists = items.includes(label);
    const next = exists ? items.filter((i) => i !== label) : [...items, label];
    onChange({ ...form, items: next });
  };

  const handleAddCustomItem = () => {
    const trimmed = customItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      setCustomItem('');
      return;
    }
    onChange({ ...form, items: [...items, trimmed] });
    setCustomItem('');
  };

  return (
  <div className="space-y-4">
    <form onSubmit={onSubmit} className="bg-slate-900/40 rounded-lg p-4 border border-slate-800 space-y-3">
      <h4 className="font-semibold text-slate-100 flex items-center gap-2">
        <PlusIcon />
        <span>ثبت سرویس / تعویض روغن</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <label className="block text-xs text-slate-400 mb-1">تاریخ سرویس *</label>
          <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-md px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
            <div className="flex-1">
              <JalaliDatePicker
                id="vehicle-service-date"
                value={form.serviceDate || new Date().toISOString()}
                onChange={(iso) =>
                  onChange({
                    ...form,
                    serviceDate: iso.slice(0, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">کیلومتر فعلی *</label>
          <input
            type="number"
            value={form.odometerKm ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                odometerKm: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            required
            min={0}
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
            placeholder="مثلاً ۱۲۳۰۰۰"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">کیلومتر سرویس بعدی</label>
          <input
            type="number"
            value={form.nextOdometerKm ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                nextOdometerKm: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs text-slate-400 mb-1">
            موارد انجام‌شده * (حداقل یک مورد را تیک بزنید)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {BASE_SERVICE_ITEMS.map((label) => {
              const checked = items.includes(label);
              return (
                <label
                  key={label}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs cursor-pointer ${
                    checked
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-600 bg-slate-900/40 text-slate-200 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-emerald-500"
                    checked={checked}
                    onChange={() => toggleItem(label)}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
            {items
              .filter((it) => !BASE_SERVICE_ITEMS.includes(it))
              .map((label) => (
                <label
                  key={label}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-400 bg-sky-500/10 text-xs text-sky-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="accent-sky-500"
                    checked
                    onChange={() => toggleItem(label)}
                  />
                  <span>{label}</span>
                </label>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomItem();
                }
              }}
              placeholder="افزودن مورد دلخواه (مثلاً تعویض لنت جلو)"
              className="flex-1 bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="button"
              onClick={handleAddCustomItem}
              className="inline-flex items-center justify-center px-3 rounded-md bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-2">
            <span>تاریخ پیشنهادی سرویس بعدی</span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <input
                type="checkbox"
                className="accent-sky-500"
                checked={!!form.nextServiceDate}
                onChange={(e) => {
                  if (!e.target.checked) {
                    onChange({ ...form, nextServiceDate: undefined });
                  } else {
                    onChange({
                      ...form,
                      nextServiceDate: (form.nextServiceDate as string) || todayIsoDateOnly(),
                    });
                  }
                }}
              />
              <span>فعال</span>
            </span>
          </label>
          <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-md px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
            <div className="flex-1 opacity-100">
              <JalaliDatePicker
                id="vehicle-next-service-date"
                value={form.nextServiceDate || new Date().toISOString()}
                onChange={(iso) =>
                  onChange({
                    ...form,
                    nextServiceDate: iso.slice(0, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">مبلغ کل سرویس (تومان) *</label>
          <input
            type="number"
            value={form.cost ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                cost: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            required
            min={0}
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">یادداشت / توضیحات تکمیلی</label>
          <textarea
            rows={2}
            value={form.notes || ''}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">فاکتور سرویس (PDF / تصویر)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const ref = await fileToImageRef(file);
              onChange({ ...form, invoiceRef: ref });
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
          <span>{form.id ? 'ذخیره سرویس' : 'ثبت سرویس'}</span>
        </button>
      </div>
    </form>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {records.map((r) => (
        <article
          key={r.id}
          className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col space-y-2 cursor-pointer hover:border-sky-500/60 transition"
          onClick={() => onShowDetails(r)}
        >
            <div className="flex items-center justify-between gap-2">
              <h5 className="font-semibold text-slate-100">
                سرویس در {formatDateLabel(r.serviceDate)}
              </h5>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({
                      id: r.id,
                      vehicleId: r.vehicleId,
                      serviceDate: r.serviceDate,
                      odometerKm: r.odometerKm,
                      nextOdometerKm: r.nextOdometerKm,
                      items: r.items || [],
                      itemsDescription: r.itemsDescription,
                      nextServiceDate: r.nextServiceDate,
                      cost: r.cost,
                      notes: r.notes,
                      invoiceRef: r.invoiceRef,
                    });
                  }}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                  aria-label="ویرایش سرویس"
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
            کیلومتر فعلی:{' '}
            {r.odometerKm != null ? r.odometerKm.toLocaleString() + ' km' : '-'}
          </p>
          <p className="text-xs text-slate-400">
            کیلومتر سرویس بعدی:{' '}
            {r.nextOdometerKm != null
              ? r.nextOdometerKm.toLocaleString() + ' km'
              : '-'}
          </p>
          {r.nextServiceDate && (
            <p className="text-xs text-slate-400">
              تاریخ پیشنهادی بعدی: {formatDateLabel(r.nextServiceDate)}
            </p>
          )}
          <p className="text-xs text-slate-300 border-t border-slate-800/60 pt-2 mt-2">
            {r.itemsDescription}
          </p>
          {r.notes && (
            <p className="text-xs text-slate-400">{r.notes}</p>
          )}
          {r.cost != null && (
            <p className="text-xs text-slate-400">
              مبلغ پرداختی: {r.cost.toLocaleString()} تومان
            </p>
          )}
          {r.invoiceRef && (
            <InsuranceDocumentLink documentRef={r.invoiceRef} />
          )}
        </article>
      ))}
      {records.length === 0 && (
        <p className="text-sm text-slate-400">
          هنوز هیچ سابقه سرویس برای این خودرو ثبت نشده است.
        </p>
      )}
    </div>
  </div>
  );
};
