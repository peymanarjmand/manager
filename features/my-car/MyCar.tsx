import React, { useEffect, useMemo, useState } from 'react';
import { useMyCarStore } from './store';
import { toast } from '../../lib/toast';
import type {
  Vehicle,
  VehicleInsurance,
  VehicleMaintenanceRecord,
  VehicleInsuranceType,
  VehicleExpense,
} from './types';
import {
  BackIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
  CarIcon,
  XIcon,
} from '../../components/Icons';
import {
  formatDateLabel,
  fileToImageRef,
  todayIsoDateOnly,
  type DetailsTab,
} from './shared';
import { VehicleImagePreview } from './components/VehicleImagePreview';
import { SpecsTab, SpecItem } from './components/SpecsTab';
import { InsuranceTab, InsuranceDocumentLink } from './components/InsuranceTab';
import { MaintenanceTab } from './components/MaintenanceTab';
import { ExpensesTab } from './components/ExpensesTab';

interface MyCarProps {
  onNavigateBack: () => void;
}

export const MyCar: React.FC<MyCarProps> = ({ onNavigateBack }) => {
  const {
    vehicles,
    insurances,
    maintenances,
    expenses,
    selectedVehicleId,
    loading,
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

  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({});
  const [insuranceForm, setInsuranceForm] = useState<Partial<VehicleInsurance>>({
    type: 'third_party',
  });
  const [maintenanceForm, setMaintenanceForm] = useState<
    Partial<VehicleMaintenanceRecord>
  >({
    serviceDate: todayIsoDateOnly(),
  });
  const [expenseForm, setExpenseForm] = useState<Partial<VehicleExpense>>({
    date: todayIsoDateOnly(),
    category: '',
  });
  const [activeTab, setActiveTab] = useState<DetailsTab>('specs');
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    resolve?: (value: boolean) => void;
  } | null>(null);
  const [detailState, setDetailState] = useState<{
    open: boolean;
    kind: 'insurance' | 'maintenance' | 'expense';
    insurance?: VehicleInsurance;
    maintenance?: VehicleMaintenanceRecord;
    expense?: VehicleExpense;
  } | null>(null);

  const selectedVehicle: Vehicle | undefined = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId),
    [vehicles, selectedVehicleId]
  );

  useEffect(() => {
    (async () => {
      await loadVehicles();
      if (selectedVehicleId) {
        await loadDetailsForVehicle(selectedVehicleId);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      loadDetailsForVehicle(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.name) return;
    const payload: Vehicle = {
      id: vehicleForm.id || '',
      name: vehicleForm.name,
      brand: vehicleForm.brand,
      model: vehicleForm.model,
      year: vehicleForm.year,
      plateNumber: vehicleForm.plateNumber,
      color: vehicleForm.color,
      engineNumber: vehicleForm.engineNumber,
      chassisNumber: vehicleForm.chassisNumber,
      vin: vehicleForm.vin,
      imageRef: vehicleForm.imageRef,
      createdAt: vehicleForm.createdAt || new Date().toISOString(),
    };
    await saveVehicle(payload);
    setVehicleForm({});
    setIsVehicleFormOpen(false);
  };

  const handleInsuranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;
    if (!insuranceForm.startDate || !insuranceForm.endDate) return;

    const payload: VehicleInsurance = {
      id: insuranceForm.id || '',
      vehicleId: selectedVehicleId,
      type: (insuranceForm.type as VehicleInsuranceType) || 'third_party',
      company: insuranceForm.company,
      policyNumber: insuranceForm.policyNumber,
      startDate: insuranceForm.startDate,
      endDate: insuranceForm.endDate,
      discountPercent: insuranceForm.discountPercent,
      premiumAmount: insuranceForm.premiumAmount,
      coverageDescription: insuranceForm.coverageDescription,
      documentRef: insuranceForm.documentRef,
      createdAt: insuranceForm.createdAt || new Date().toISOString(),
    };
    await saveInsurance(payload);
    setInsuranceForm({ type: insuranceForm.type || 'third_party' });
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;

    const items = maintenanceForm.items || [];
    if (!items.length) {
      toast.warning('حداقل یک مورد سرویس را انتخاب کنید.');
      return;
    }

    // Odometer (current km) is required (0 allowed)
    if (
      maintenanceForm.odometerKm === undefined ||
      maintenanceForm.odometerKm === null ||
      Number.isNaN(maintenanceForm.odometerKm as number)
    ) {
      toast.warning('لطفاً کیلومتر فعلی را وارد کنید.');
      return;
    }

    // Cost is required (0 allowed)
    if (
      maintenanceForm.cost === undefined ||
      maintenanceForm.cost === null ||
      Number.isNaN(maintenanceForm.cost as number)
    ) {
      toast.warning('لطفاً مبلغ سرویس را وارد کنید (صفر هم قابل قبول است).');
      return;
    }

    const serviceDate =
      maintenanceForm.serviceDate || new Date().toISOString().slice(0, 10);

    const payload: VehicleMaintenanceRecord = {
      id: maintenanceForm.id || '',
      vehicleId: selectedVehicleId,
      serviceDate,
      odometerKm: maintenanceForm.odometerKm,
      nextOdometerKm: maintenanceForm.nextOdometerKm,
      itemsDescription:
        maintenanceForm.itemsDescription || items.join('، '),
      items,
      nextServiceDate: maintenanceForm.nextServiceDate,
      cost: maintenanceForm.cost,
      notes: maintenanceForm.notes,
      invoiceRef: maintenanceForm.invoiceRef,
      createdAt: maintenanceForm.createdAt || new Date().toISOString(),
    };
    await saveMaintenance(payload);
    setMaintenanceForm({
      serviceDate: todayIsoDateOnly(),
      odometerKm: undefined,
      nextOdometerKm: undefined,
      items: [],
      nextServiceDate: undefined,
      cost: undefined,
      notes: undefined,
      invoiceRef: undefined,
      itemsDescription: '',
    });
  };

  const handleDeleteMaintenanceWithExpense = async (id: string) => {
    const proceed = await openConfirm({
      title: 'حذف سرویس',
      message: 'آیا از حذف این سرویس مطمئن هستید؟ این عمل می‌تواند روی مخارج خودرو نیز تاثیر بگذارد.',
      confirmLabel: 'بله، حذف شود',
      cancelLabel: 'انصراف',
    });
    if (!proceed) return;

    const linkedExpense = expenses.find(
      (e) => e.maintenanceId === id || e.id === id
    );
    if (linkedExpense) {
      const alsoDelete = await openConfirm({
        title: 'حذف تراکنش مرتبط',
        message:
          'برای این سرویس یک تراکنش در مخارج خودرو ثبت شده است. آیا می‌خواهید آن تراکنش هم حذف شود؟',
        confirmLabel: 'بله، سرویس و تراکنش را حذف کن',
        cancelLabel: 'فقط سرویس را حذف کن',
      });
      if (alsoDelete) {
        await deleteExpense(linkedExpense.id);
      }
    }

    await deleteMaintenance(id);
  };

  const handleDeleteInsurance = async (id: string) => {
    const proceed = await openConfirm({
      title: 'حذف بیمه‌نامه',
      message: 'آیا از حذف این بیمه‌نامه مطمئن هستید؟ این عمل قابل بازگشت نیست.',
      confirmLabel: 'بله، حذف شود',
      cancelLabel: 'انصراف',
    });
    if (!proceed) return;
    await deleteInsurance(id);
  };

  const handleDeleteExpense = async (id: string) => {
    const proceed = await openConfirm({
      title: 'حذف هزینه',
      message: 'آیا از حذف این هزینه مطمئن هستید؟',
      confirmLabel: 'بله، حذف شود',
      cancelLabel: 'انصراف',
    });
    if (!proceed) return;
    await deleteExpense(id);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;

    const amount =
      expenseForm.amount != null && !Number.isNaN(expenseForm.amount)
        ? Number(expenseForm.amount)
        : NaN;
    if (Number.isNaN(amount)) {
      toast.warning('لطفاً مبلغ را به‌صورت عدد وارد کنید (صفر هم مجاز است).');
      return;
    }

    const category = (expenseForm.category || '').trim();
    if (!category) {
      toast.warning('لطفاً بابت هزینه را مشخص کنید.');
      return;
    }

    const date =
      expenseForm.date && expenseForm.date.length >= 10
        ? expenseForm.date.slice(0, 10)
        : todayIsoDateOnly();

    const payload: VehicleExpense = {
      id: expenseForm.id || '',
      vehicleId: selectedVehicleId,
      date,
      amount,
      category,
      description: expenseForm.description,
      attachmentRef: expenseForm.attachmentRef,
      maintenanceId: expenseForm.maintenanceId,
      createdAt: expenseForm.createdAt || new Date().toISOString(),
    };

    await saveExpense(payload);
    setExpenseForm({
      date: todayIsoDateOnly(),
      category,
    });
  };

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

  const openInsuranceDetails = (ins: VehicleInsurance) => {
    setDetailState({
      open: true,
      kind: 'insurance',
      insurance: ins,
    });
  };

  const openMaintenanceDetails = (rec: VehicleMaintenanceRecord) => {
    setDetailState({
      open: true,
      kind: 'maintenance',
      maintenance: rec,
    });
  };

  const openExpenseDetails = (exp: VehicleExpense) => {
    setDetailState({
      open: true,
      kind: 'expense',
      expense: exp,
    });
  };

  const openConfirm = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'تایید',
        cancelLabel: options.cancelLabel ?? 'انصراف',
        resolve,
      });
    });
  };

  const handleConfirmClose = (value: boolean) => {
    if (confirmState?.resolve) {
      confirmState.resolve(value);
    }
    setConfirmState(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateBack}
            className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg transition"
            title="بازگشت به داشبورد"
          >
            <BackIcon />
          </button>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-2">
            <CarIcon />
            <span>خودروی من</span>
          </h2>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-900/40 border border-rose-700 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
        <section className="bg-white/[0.04] rounded-xl p-4 sm:p-5 ring-1 ring-white/10 space-y-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-semibold">لیست خودروها</h3>
              <p className="text-xs text-slate-400 mt-1">
                برای مشاهده جزئیات، یک خودرو را انتخاب کنید.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-slate-400">
                {loading ? 'در حال بارگذاری...' : `${vehicles.length} خودرو`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setVehicleForm({});
                  setIsVehicleFormOpen((open) => !open);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 transition"
              >
                <PlusIcon />
                <span>{isVehicleFormOpen ? 'بستن فرم' : 'افزودن خودرو'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {vehicles.map((v) => (
              <div
                key={v.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  selectVehicle(v.id);
                  setVehicleForm(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectVehicle(v.id);
                    setVehicleForm(v);
                  }
                }}
                className={`w-full text-right flex items-center justify-between px-3 py-2 rounded-lg border ${
                  v.id === selectedVehicleId
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-white/10 bg-slate-900/40 hover:border-slate-500'
                } transition cursor-pointer`}
              >
                <div className="flex flex-col text-sm">
                  <span className="font-semibold text-slate-100">{v.name}</span>
                  <span className="text-slate-400">
                    {[v.brand, v.model, v.plateNumber].filter(Boolean).join(' - ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVehicleForm(v);
                      setIsVehicleFormOpen(true);
                    }}
                    className="p-1 rounded-full hover:bg-slate-700 text-slate-300"
                    aria-label="ویرایش خودرو"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const proceed = await openConfirm({
                        title: 'حذف خودرو',
                        message:
                          'آیا از حذف این خودرو و تمام اطلاعات وابسته (بیمه، سرویس‌ها و مخارج) مطمئن هستید؟',
                        confirmLabel: 'بله، حذف شود',
                        cancelLabel: 'انصراف',
                      });
                      if (!proceed) return;
                      await deleteVehicle(v.id);
                    }}
                    className="p-1 rounded-full hover:bg-slate-700 text-rose-400"
                    aria-label="حذف خودرو"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && (
              <p className="text-sm text-slate-400">
                هنوز هیچ خودرویی ثبت نکرده‌اید. فرم زیر را برای افزودن اولین خودرو
                تکمیل کنید.
              </p>
            )}
          </div>

          <hr className="border-white/10 my-3" />

          <div
            className={`transition-all duration-300 origin-top ${
              isVehicleFormOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none h-0 overflow-hidden'
            }`}
          >
          <form onSubmit={handleVehicleSubmit} className="space-y-3 pt-1">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full bg-sky-500/10 text-sky-400 p-1.5">
                <PlusIcon />
              </span>
              <span className="text-sm">
                {vehicleForm.id ? 'ویرایش خودرو انتخاب‌شده' : 'افزودن خودرو جدید'}
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">نام نمایشی *</label>
                <input
                  required
                  value={vehicleForm.name || ''}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="مثلاً ۲۰۶ نقره‌ای"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">برند</label>
                <input
                  value={vehicleForm.brand || ''}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, brand: e.target.value })
                  }
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                  placeholder="ایران‌خودرو، سایپا، ..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">مدل</label>
                <input
                  value={vehicleForm.model || ''}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, model: e.target.value })
                  }
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                  placeholder="تیپ ۲، SLX، ..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">سال ساخت</label>
                <input
                  type="number"
                  value={vehicleForm.year ?? ''}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      year: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                  placeholder="مثلاً ۱۳۹۸"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">شماره پلاک</label>
                <input
                  value={vehicleForm.plateNumber || ''}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })
                  }
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                  placeholder="مثلاً ۱۲الف۳۴-۹۹"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">رنگ</label>
                <input
                  value={vehicleForm.color || ''}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, color: e.target.value })
                  }
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                  placeholder="سفید، نقره‌ای، ..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">شماره موتور</label>
                <input
                  value={vehicleForm.engineNumber || ''}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, engineNumber: e.target.value })
                  }
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">شماره شاسی</label>
                <input
                  value={vehicleForm.chassisNumber || ''}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, chassisNumber: e.target.value })
                  }
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">VIN</label>
                <input
                  value={vehicleForm.vin || ''}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-md px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  تصویر خودرو (jpg/png/pdf)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const ref = await fileToImageRef(file);
                    setVehicleForm({ ...vehicleForm, imageRef: ref });
                  }}
                  className="w-full text-xs text-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold px-4 py-2 rounded-md transition"
              >
                <PlusIcon />
                <span>{vehicleForm.id ? 'ذخیره تغییرات' : 'افزودن خودرو'}</span>
              </button>
            </div>
          </form>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white/[0.04] rounded-xl p-4 sm:p-5 ring-1 ring-white/10">
            {selectedVehicle ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-100">
                      {selectedVehicle.name}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      {[selectedVehicle.brand, selectedVehicle.model, selectedVehicle.plateNumber]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                  </div>
                  {selectedVehicle.imageRef && (
                    <VehicleImagePreview imageRef={selectedVehicle.imageRef} />
                  )}
                </div>

                <div className="border-b border-white/10 mb-4">
                  <nav className="-mb-px flex space-x-4 space-x-reverse overflow-x-auto text-sm">
                    <button
                      onClick={() => setActiveTab('specs')}
                      className={`px-3 py-2 border-b-2 ${
                        activeTab === 'specs'
                          ? 'border-sky-400 text-sky-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      مشخصات خودرو
                    </button>
                    <button
                      onClick={() => setActiveTab('insurance')}
                      className={`px-3 py-2 border-b-2 ${
                        activeTab === 'insurance'
                          ? 'border-sky-400 text-sky-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      بیمه‌ها
                    </button>
                    <button
                      onClick={() => setActiveTab('maintenance')}
                      className={`px-3 py-2 border-b-2 ${
                        activeTab === 'maintenance'
                          ? 'border-sky-400 text-sky-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      سوابق فنی و سرویس‌ها
                    </button>
                    <button
                      onClick={() => setActiveTab('expenses')}
                      className={`px-3 py-2 border-b-2 ${
                        activeTab === 'expenses'
                          ? 'border-sky-400 text-sky-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      مخارج خودرو
                    </button>
                  </nav>
                </div>

                {activeTab === 'specs' && (
                  <SpecsTab vehicle={selectedVehicle} />
                )}
                {activeTab === 'insurance' && (
                  <InsuranceTab
                    insurances={filteredInsurances}
                    form={insuranceForm}
                    onChange={setInsuranceForm}
                    onSubmit={handleInsuranceSubmit}
                    onDelete={handleDeleteInsurance}
                    onShowDetails={openInsuranceDetails}
                  />
                )}
                {activeTab === 'maintenance' && (
                  <MaintenanceTab
                    records={filteredMaintenances}
                    form={maintenanceForm}
                    onChange={setMaintenanceForm}
                    onSubmit={handleMaintenanceSubmit}
                    onDelete={handleDeleteMaintenanceWithExpense}
                    onShowDetails={openMaintenanceDetails}
                  />
                )}
                {activeTab === 'expenses' && (
                  <ExpensesTab
                    records={filteredExpenses}
                    form={expenseForm}
                    onChange={(patch) =>
                      setExpenseForm((prev) => ({
                        ...(prev || {}),
                        ...patch,
                      }))
                    }
                    onSubmit={handleExpenseSubmit}
                    onDelete={handleDeleteExpense}
                    onShowDetails={openExpenseDetails}
                  />
                )}
              </>
            ) : (
              <p className="text-slate-400 text-sm">
                ابتدا یک خودرو از ستون سمت راست انتخاب یا اضافه کنید تا جزئیات آن
                نمایش داده شود.
              </p>
            )}
          </div>
        </section>
      </div>

      {confirmState?.open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-2xl shadow-xl ring-1 ring-white/10">
            <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                {confirmState.title}
              </h3>
            </div>
            <div className="px-5 py-4 text-sm text-slate-300">
              {confirmState.message}
            </div>
            <div className="px-5 pb-4 pt-2 flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-100 px-4 py-2 transition"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className="w-full sm:w-auto inline-flex justify-center items-center rounded-md bg-rose-500 hover:bg-rose-600 text-sm font-bold text-white px-4 py-2 transition"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailState?.open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 rounded-2xl shadow-xl ring-1 ring-white/10">
            <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  {detailState.kind === 'insurance' && 'جزئیات بیمه‌نامه'}
                  {detailState.kind === 'maintenance' && 'جزئیات سرویس فنی'}
                  {detailState.kind === 'expense' && 'جزئیات هزینه خودرو'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 hidden sm:block">
                  خلاصه‌ای از اطلاعات ثبت‌شده برای بررسی سریع شما.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailState(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                aria-label="بستن"
              >
                <XIcon />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 text-sm text-slate-100">
              {detailState.kind === 'insurance' && detailState.insurance && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SpecItem label="نوع بیمه" value={detailState.insurance.type === 'third_party' ? 'شخص ثالث' : 'بیمه بدنه'} />
                    <SpecItem label="شرکت بیمه" value={detailState.insurance.company} />
                    <SpecItem label="شماره بیمه‌نامه" value={detailState.insurance.policyNumber} />
                    <SpecItem
                      label="بازه اعتبار"
                      value={`${formatDateLabel(detailState.insurance.startDate)} تا ${formatDateLabel(detailState.insurance.endDate)}`}
                    />
                    <SpecItem
                      label="درصد تخفیف"
                      value={detailState.insurance.discountPercent != null ? `${detailState.insurance.discountPercent}%` : '-'}
                    />
                    <SpecItem
                      label="مبلغ حق بیمه"
                      value={detailState.insurance.premiumAmount != null ? `${detailState.insurance.premiumAmount.toLocaleString()} تومان` : '-'}
                    />
                  </div>
                  {detailState.insurance.coverageDescription && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <p className="text-xs text-slate-400 mb-1">پوشش‌ها</p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {detailState.insurance.coverageDescription}
                      </p>
                    </div>
                  )}
                  {detailState.insurance.documentRef && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <p className="text-xs text-slate-400 mb-1">فایل بیمه‌نامه</p>
                      <InsuranceDocumentLink documentRef={detailState.insurance.documentRef} />
                    </div>
                  )}
                </div>
              )}

              {detailState.kind === 'maintenance' && detailState.maintenance && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SpecItem label="تاریخ سرویس" value={formatDateLabel(detailState.maintenance.serviceDate)} />
                    <SpecItem
                      label="مبلغ سرویس"
                      value={detailState.maintenance.cost != null ? `${detailState.maintenance.cost.toLocaleString()} تومان` : '-'}
                    />
                    <SpecItem
                      label="کیلومتر فعلی"
                      value={detailState.maintenance.odometerKm != null ? detailState.maintenance.odometerKm.toLocaleString() : '-'}
                    />
                    <SpecItem
                      label="کیلومتر سرویس بعدی"
                      value={detailState.maintenance.nextOdometerKm != null ? detailState.maintenance.nextOdometerKm.toLocaleString() : '-'}
                    />
                    <SpecItem
                      label="تاریخ پیشنهادی سرویس بعدی"
                      value={detailState.maintenance.nextServiceDate ? formatDateLabel(detailState.maintenance.nextServiceDate) : '-'}
                    />
                  </div>
                  <div className="pt-2 border-t border-slate-800/70">
                    <p className="text-xs text-slate-400 mb-1">موارد انجام‌شده</p>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {detailState.maintenance.items?.length
                        ? detailState.maintenance.items.join('، ')
                        : detailState.maintenance.itemsDescription}
                    </p>
                  </div>
                  {detailState.maintenance.notes && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <p className="text-xs text-slate-400 mb-1">یادداشت</p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {detailState.maintenance.notes}
                      </p>
                    </div>
                  )}
                  {detailState.maintenance.invoiceRef && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <p className="text-xs text-slate-400 mb-1">فاکتور سرویس</p>
                      <InsuranceDocumentLink documentRef={detailState.maintenance.invoiceRef} />
                    </div>
                  )}
                </div>
              )}

              {detailState.kind === 'expense' && detailState.expense && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SpecItem label="بابت" value={detailState.expense.category} />
                    <SpecItem
                      label="مبلغ"
                      value={`${detailState.expense.amount.toLocaleString()} تومان`}
                    />
                    <SpecItem label="تاریخ" value={formatDateLabel(detailState.expense.date)} />
                    <SpecItem
                      label="مرتبط با سرویس"
                      value={detailState.expense.maintenanceId ? 'بله' : 'خیر'}
                    />
                  </div>
                  {detailState.expense.description && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <p className="text-xs text-slate-400 mb-1">توضیحات</p>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {detailState.expense.description}
                      </p>
                    </div>
                  )}
                  {detailState.expense.attachmentRef && (
                    <div className="pt-2 border-t border-slate-800/70">
                      <p className="text-xs text-slate-400 mb-1">رسید هزینه</p>
                      <InsuranceDocumentLink documentRef={detailState.expense.attachmentRef} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
