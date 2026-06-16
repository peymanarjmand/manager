import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Car, ArrowRight, Pencil, Trash2, CarFront } from 'lucide-react';
import { useMyCarStore } from './store';
import { confirm } from '../../lib/confirm';
import type { Vehicle } from './types';
import type { DetailsTab } from './shared';
import { VehicleSelector } from './components/VehicleSelector';
import { StatTiles } from './components/StatTiles';
import { VehicleThumb } from './components/VehicleImagePreview';
import { SpecsTab } from './components/SpecsTab';
import { InsuranceTab } from './components/InsuranceTab';
import { MaintenanceTab } from './components/MaintenanceTab';
import { ExpensesTab } from './components/ExpensesTab';
import { VehicleFormSheet } from './components/VehicleFormSheet';
import { DetailSheet, type DetailState } from './components/DetailSheet';
import { EmptyState, IconButton } from './components/ui';

interface MyCarProps {
  onNavigateBack: () => void;
}

const TABS: { id: DetailsTab; label: string }[] = [
  { id: 'specs', label: 'مشخصات' },
  { id: 'insurance', label: 'بیمه' },
  { id: 'maintenance', label: 'سرویس‌ها' },
  { id: 'expenses', label: 'هزینه‌ها' },
];

const ACTIVE_TAB_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg,#6d5ef6,#8b7cff)',
};

export const MyCar: React.FC<MyCarProps> = ({ onNavigateBack }) => {
  const {
    vehicles,
    insurances,
    maintenances,
    expenses,
    selectedVehicleId,
    error,
    loadVehicles,
    loadDetailsForVehicle,
    saveVehicle,
    deleteVehicle,
    saveInsurance,
    deleteInsurance,
    saveMaintenance,
    deleteMaintenance,
    saveExpense,
    deleteExpense,
    selectVehicle,
  } = useMyCarStore();

  const [activeTab, setActiveTab] = useState<DetailsTab>('specs');
  const [vehicleSheetOpen, setVehicleSheetOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);

  const tabSectionRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId]
  );

  useEffect(() => {
    (async () => {
      await loadVehicles();
      if (selectedVehicleId) await loadDetailsForVehicle(selectedVehicleId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedVehicleId) loadDetailsForVehicle(selectedVehicleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  const filteredInsurances = useMemo(
    () => insurances.filter((i) => i.vehicleId === selectedVehicleId),
    [insurances, selectedVehicleId]
  );
  const filteredMaintenances = useMemo(
    () => maintenances.filter((m) => m.vehicleId === selectedVehicleId),
    [maintenances, selectedVehicleId]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.vehicleId === selectedVehicleId),
    [expenses, selectedVehicleId]
  );

  const descriptor = selectedVehicle
    ? [selectedVehicle.brand, selectedVehicle.model, selectedVehicle.year, selectedVehicle.plateNumber]
        .filter(Boolean)
        .join(' · ')
    : '';

  const openAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleSheetOpen(true);
  };
  const openEditVehicle = () => {
    if (selectedVehicle) {
      setEditingVehicle(selectedVehicle);
      setVehicleSheetOpen(true);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return;
    const ok = await confirm({
      title: 'حذف خودرو',
      message: `«${selectedVehicle.name}» و همه‌ی اطلاعات وابسته (بیمه، سرویس‌ها و هزینه‌ها) حذف می‌شود. این عمل بازگشت‌ناپذیر است.`,
      tone: 'danger',
      confirmText: 'حذف خودرو',
      cancelText: 'انصراف',
    });
    if (ok) await deleteVehicle(selectedVehicle.id);
  };

  const handleDeleteInsurance = async (id: string) => {
    const ok = await confirm({
      title: 'حذف بیمه‌نامه',
      message: 'این بیمه‌نامه حذف شود؟ این عمل بازگشت‌ناپذیر است.',
      tone: 'danger',
      confirmText: 'حذف',
      cancelText: 'انصراف',
    });
    if (ok) await deleteInsurance(id);
  };

  const handleDeleteExpense = async (id: string) => {
    const ok = await confirm({
      title: 'حذف هزینه',
      message: 'این هزینه حذف شود؟',
      tone: 'danger',
      confirmText: 'حذف',
      cancelText: 'انصراف',
    });
    if (ok) await deleteExpense(id);
  };

  // Preserves the original delete-with-linked-expense flow.
  const handleDeleteMaintenance = async (id: string) => {
    const ok = await confirm({
      title: 'حذف سرویس',
      message: 'این سرویس حذف شود؟ ممکن است روی مخارج خودرو هم اثر بگذارد.',
      tone: 'danger',
      confirmText: 'حذف سرویس',
      cancelText: 'انصراف',
    });
    if (!ok) return;

    const linked = expenses.find((e) => e.maintenanceId === id || e.id === id);
    if (linked) {
      const alsoDelete = await confirm({
        title: 'حذف تراکنش مرتبط',
        message: 'برای این سرویس یک هزینه در مخارج خودرو ثبت شده است. آن هزینه هم حذف شود؟',
        tone: 'warning',
        confirmText: 'حذف سرویس و هزینه',
        cancelText: 'فقط سرویس',
      });
      if (alsoDelete) await deleteExpense(linked.id);
    }
    await deleteMaintenance(id);
  };

  const navigateTab = (tab: DetailsTab) => {
    setActiveTab(tab);
    tabSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/20 flex items-center justify-center">
            <Car size={24} />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">خودروی من</h2>
            <p className="text-xs text-slate-400 mt-0.5">مدیریت و مشاهده اطلاعات خودروها</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateBack}
          aria-label="بازگشت"
          className="w-10 h-10 flex items-center justify-center bg-white/[0.05] ring-1 ring-white/10 hover:bg-white/10 text-slate-300 rounded-xl transition shrink-0"
        >
          <ArrowRight size={20} />
        </button>
      </header>

      {error && (
        <div className="mb-3 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/20 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="mb-4">
        <VehicleSelector
          vehicles={vehicles}
          selectedId={selectedVehicleId}
          onSelect={selectVehicle}
          onAdd={openAddVehicle}
        />
      </div>

      {selectedVehicle ? (
        <div className="space-y-4">
          <StatTiles
            insurances={filteredInsurances}
            maintenances={filteredMaintenances}
            expenses={filteredExpenses}
            onNavigate={navigateTab}
          />

          <section
            ref={tabSectionRef}
            className="rounded-3xl p-4 sm:p-5 ring-1 ring-white/10 bg-white/[0.04] relative overflow-hidden scroll-mt-4"
          >
            <div className="absolute -top-16 -left-10 w-48 h-48 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

            {/* Hero head: title + actions (right) · photo (left) */}
            <div className="relative flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-white truncate">{selectedVehicle.name}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton label="ویرایش خودرو" onClick={openEditVehicle}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton label="حذف خودرو" tone="danger" onClick={handleDeleteVehicle}>
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>
                {descriptor && (
                  <p className="text-xs text-slate-400 mt-1.5 leading-6" dir="auto">
                    {descriptor}
                  </p>
                )}
                <div className="h-px bg-white/10 mt-3" />
              </div>
              <VehicleThumb imageRef={selectedVehicle.imageRef} className="w-24 h-20" iconSize={34} />
            </div>

            {/* Segmented tab bar */}
            <div className="relative mt-4 flex gap-1 p-1 rounded-2xl bg-black/20 ring-1 ring-white/[0.06]">
              {TABS.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    style={active ? ACTIVE_TAB_STYLE : undefined}
                    className={`flex-1 whitespace-nowrap px-2 py-2 rounded-xl text-[13px] font-medium transition ${
                      active ? 'text-white shadow-lg shadow-brand-900/30' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="relative mt-4">
              {activeTab === 'specs' && <SpecsTab vehicle={selectedVehicle} />}
              {activeTab === 'insurance' && (
                <InsuranceTab
                  insurances={filteredInsurances}
                  vehicleId={selectedVehicle.id}
                  onSave={saveInsurance}
                  onDelete={handleDeleteInsurance}
                  onShowDetails={(insurance) => setDetail({ kind: 'insurance', insurance })}
                />
              )}
              {activeTab === 'maintenance' && (
                <MaintenanceTab
                  records={filteredMaintenances}
                  vehicleId={selectedVehicle.id}
                  onSave={saveMaintenance}
                  onDelete={handleDeleteMaintenance}
                  onShowDetails={(maintenance) => setDetail({ kind: 'maintenance', maintenance })}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpensesTab
                  records={filteredExpenses}
                  vehicleId={selectedVehicle.id}
                  onSave={saveExpense}
                  onDelete={handleDeleteExpense}
                  onShowDetails={(expense) => setDetail({ kind: 'expense', expense })}
                />
              )}
            </div>
          </section>
        </div>
      ) : (
        <EmptyState icon={<CarFront size={34} />}>
          هنوز خودرویی ثبت نکرده‌اید. با کارت «افزودن خودرو» در بالا، اولین خودروی خود را اضافه کنید.
        </EmptyState>
      )}

      <VehicleFormSheet
        open={vehicleSheetOpen}
        vehicle={editingVehicle}
        onClose={() => setVehicleSheetOpen(false)}
        onSave={saveVehicle}
      />
      <DetailSheet state={detail} onClose={() => setDetail(null)} />
    </div>
  );
};
