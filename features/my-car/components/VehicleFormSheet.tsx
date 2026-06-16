import React, { useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import type { Vehicle } from '../types';
import { Sheet, SheetActions, Field, TextInput, AttachmentField } from './ui';
import { VehicleThumb } from './VehicleImagePreview';

interface Props {
  open: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (payload: Omit<Vehicle, 'createdAt'>) => Promise<void>;
}

const FORM_ID = 'my-car-vehicle-form';

export const VehicleFormSheet: React.FC<Props> = ({ open, vehicle, onClose, onSave }) => {
  const [form, setForm] = useState<Partial<Vehicle>>({});

  // Sync the form whenever the sheet opens (add → empty, edit → the vehicle).
  useEffect(() => {
    if (open) setForm(vehicle ? { ...vehicle } : {});
  }, [open, vehicle]);

  const patch = (p: Partial<Vehicle>) => setForm((prev) => ({ ...prev, ...p }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    await onSave({
      id: form.id || '',
      name: form.name.trim(),
      brand: form.brand,
      model: form.model,
      year: form.year,
      plateNumber: form.plateNumber,
      color: form.color,
      engineNumber: form.engineNumber,
      chassisNumber: form.chassisNumber,
      vin: form.vin,
      imageRef: form.imageRef,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={form.id ? 'ویرایش خودرو' : 'افزودن خودرو'}
      subtitle="مشخصات خودرو را وارد کنید. فقط نام نمایشی الزامی است."
      icon={<Car size={20} />}
      footer={
        <SheetActions formId={FORM_ID} onCancel={onClose} submitLabel={form.id ? 'ذخیره تغییرات' : 'افزودن خودرو'} />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex items-center gap-3">
          <VehicleThumb imageRef={form.imageRef} className="w-16 h-16" iconSize={26} />
          <p className="text-xs text-slate-400 leading-6">
            تصویر خودرو (اختیاری) را از بخش پایین فرم بارگذاری کنید.
          </p>
        </div>

        <Field label="نام نمایشی" required className="col-span-2">
          <TextInput value={form.name || ''} onChange={(e) => patch({ name: e.target.value })} placeholder="مثلاً ۲۰۶ نقره‌ای" required />
        </Field>
        <Field label="برند">
          <TextInput value={form.brand || ''} onChange={(e) => patch({ brand: e.target.value })} placeholder="ایران‌خودرو، سایپا…" />
        </Field>
        <Field label="مدل">
          <TextInput value={form.model || ''} onChange={(e) => patch({ model: e.target.value })} placeholder="تیپ ۲، SLX…" />
        </Field>
        <Field label="سال ساخت">
          <TextInput
            type="number"
            value={form.year ?? ''}
            onChange={(e) => patch({ year: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="مثلاً ۱۳۹۸"
          />
        </Field>
        <Field label="رنگ">
          <TextInput value={form.color || ''} onChange={(e) => patch({ color: e.target.value })} placeholder="سفید، نقره‌ای…" />
        </Field>
        <Field label="شماره پلاک" className="col-span-2">
          <TextInput value={form.plateNumber || ''} onChange={(e) => patch({ plateNumber: e.target.value })} placeholder="مثلاً ۱۲ الف ۳۴۵ - ۹۹" />
        </Field>
        <Field label="شماره موتور">
          <TextInput value={form.engineNumber || ''} onChange={(e) => patch({ engineNumber: e.target.value })} />
        </Field>
        <Field label="شماره شاسی">
          <TextInput value={form.chassisNumber || ''} onChange={(e) => patch({ chassisNumber: e.target.value })} />
        </Field>
        <Field label="VIN" className="col-span-2">
          <TextInput value={form.vin || ''} onChange={(e) => patch({ vin: e.target.value })} />
        </Field>
        <div className="col-span-2">
          <AttachmentField label="تصویر خودرو (PDF / تصویر)" value={form.imageRef} onChange={(ref) => patch({ imageRef: ref })} />
        </div>
      </form>
    </Sheet>
  );
};
