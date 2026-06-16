import React from 'react';
import { Plus, Check } from 'lucide-react';
import type { Vehicle } from '../types';
import { VehicleThumb } from './VehicleImagePreview';

interface Props {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

/** Horizontal, snap-scrolling vehicle picker with an "add vehicle" card first. */
export const VehicleSelector: React.FC<Props> = ({ vehicles, selectedId, onSelect, onAdd }) => (
  <div className="flex gap-3 overflow-x-auto pb-1.5 -mx-1 px-1 snap-x">
    <button
      type="button"
      onClick={onAdd}
      className="snap-start shrink-0 w-32 h-[88px] rounded-2xl border-2 border-dashed border-white/15 hover:border-brand-400/60 bg-white/[0.02] hover:bg-brand-500/[0.06] text-slate-300 hover:text-brand-200 flex flex-col items-center justify-center gap-1.5 transition"
    >
      <Plus size={22} />
      <span className="text-xs font-semibold">افزودن خودرو</span>
    </button>

    {vehicles.map((v) => {
      const selected = v.id === selectedId;
      return (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(v.id)}
          className={`snap-start shrink-0 w-44 h-[88px] rounded-2xl p-3 flex items-center gap-3 text-right transition relative ${
            selected
              ? 'bg-brand-500/[0.12] ring-2 ring-brand-500/70'
              : 'bg-white/[0.04] ring-1 ring-white/[0.06] hover:bg-white/[0.07]'
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-slate-100 truncate">{v.name}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {[v.brand, v.model].filter(Boolean).join(' · ') || 'بدون مشخصات'}
            </p>
          </div>
          <VehicleThumb imageRef={v.imageRef} className="w-14 h-14" rounded="rounded-xl" iconSize={22} />
          {selected && (
            <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center ring-2 ring-slate-900">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </button>
      );
    })}
  </div>
);
