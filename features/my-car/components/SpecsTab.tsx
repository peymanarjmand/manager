import React from 'react';
import {
  User,
  BadgeCheck,
  Car,
  CalendarDays,
  RectangleEllipsis,
  Palette,
  Cog,
  Frame,
  Fingerprint,
  CalendarClock,
} from 'lucide-react';
import type { Vehicle } from '../types';
import { formatJalali } from '../vehicle-status';

const SpecItem: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3.5 flex items-center gap-3">
    <div className="min-w-0 flex-1 text-right">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-sm text-slate-100 font-semibold mt-1 break-words leading-6 nums-tabular" dir="auto">
        {value || '—'}
      </p>
    </div>
    <span className="w-9 h-9 rounded-xl bg-brand-500/12 text-brand-300 flex items-center justify-center shrink-0">
      {icon}
    </span>
  </div>
);

/** Vehicle specifications as a two-column, icon-led grid. */
export const SpecsTab: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => (
  <div className="grid grid-cols-2 gap-2.5">
    <SpecItem icon={<User size={18} />} label="نام" value={vehicle.name} />
    <SpecItem icon={<BadgeCheck size={18} />} label="برند" value={vehicle.brand} />
    <SpecItem icon={<Car size={18} />} label="مدل" value={vehicle.model} />
    <SpecItem
      icon={<CalendarDays size={18} />}
      label="سال ساخت"
      value={vehicle.year ? String(vehicle.year) : ''}
    />
    <SpecItem icon={<RectangleEllipsis size={18} />} label="پلاک" value={vehicle.plateNumber} />
    <SpecItem icon={<Palette size={18} />} label="رنگ" value={vehicle.color} />
    <SpecItem icon={<Cog size={18} />} label="شماره موتور" value={vehicle.engineNumber} />
    <SpecItem icon={<Frame size={18} />} label="شماره شاسی" value={vehicle.chassisNumber} />
    <SpecItem icon={<Fingerprint size={18} />} label="VIN" value={vehicle.vin} />
    <SpecItem icon={<CalendarClock size={18} />} label="تاریخ ثبت" value={formatJalali(vehicle.createdAt)} />
  </div>
);
