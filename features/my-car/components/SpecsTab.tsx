import React from 'react';
import type { Vehicle } from '../types';
import { formatDateLabel } from '../shared';

export const SpecsTab: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
    <SpecItem label="نام" value={vehicle.name} />
    <SpecItem label="برند" value={vehicle.brand} />
    <SpecItem label="مدل" value={vehicle.model} />
    <SpecItem label="سال ساخت" value={vehicle.year ? String(vehicle.year) : ''} />
    <SpecItem label="پلاک" value={vehicle.plateNumber} />
    <SpecItem label="رنگ" value={vehicle.color} />
    <SpecItem label="شماره موتور" value={vehicle.engineNumber} />
    <SpecItem label="شماره شاسی" value={vehicle.chassisNumber} />
    <SpecItem label="VIN" value={vehicle.vin} />
    <SpecItem label="تاریخ ثبت" value={formatDateLabel(vehicle.createdAt)} />
  </div>
);

export const SpecItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex flex-col bg-slate-900/40 rounded-md px-3 py-2 border border-slate-800">
    <span className="text-xs text-slate-400 mb-1">{label}</span>
    <span className="text-slate-100">{value || '-'}</span>
  </div>
);
