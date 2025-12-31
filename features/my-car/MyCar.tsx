import React, { useEffect, useMemo, useState } from 'react';
import { useMyCarStore } from './store';
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
  CalendarIcon,
  CarIcon,
  FileTextIcon,
} from '../../components/Icons';
import JalaliDatePicker from '../assets/components/JalaliDatePicker';
import { isImageRef, getObjectURLByRef, saveImageDataURL } from '../../lib/idb-images';

interface MyCarProps {
  onNavigateBack: () => void;
}

type DetailsTab = 'specs' | 'insurance' | 'maintenance' | 'expenses';

const BASE_EXPENSE_CATEGORIES: string[] = [
  'لوازم یدکی',
  'سرویس',
  'هزینه بنزین',
];

const BASE_SERVICE_ITEMS: string[] = [
  'تعویض روغن موتور',
  'تعویض فیلتر روغن',
  'تعویض فیلتر هوا',
  'تعویض فیلتر سوخت',
  'تعویض فیلتر کابین',
  'بازرسی ترمزها',
  'تعویض ضدیخ / آب رادیاتور',
];

function formatDateLabel(iso: string | undefined) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR');
  } catch {
    return iso;
  }
}

async function fileToImageRef(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const ref = await saveImageDataURL(dataUrl);
        resolve(ref);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function todayIsoDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
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
      window.alert('حداقل یک مورد سرویس را انتخاب کنید.');
      return;
    }

    // Odometer (current km) is required (0 allowed)
    if (
      maintenanceForm.odometerKm === undefined ||
      maintenanceForm.odometerKm === null ||
      Number.isNaN(maintenanceForm.odometerKm as number)
    ) {
      window.alert('لطفاً کیلومتر فعلی را وارد کنید.');
      return;
    }

    // Cost is required (0 allowed)
    if (
      maintenanceForm.cost === undefined ||
      maintenanceForm.cost === null ||
      Number.isNaN(maintenanceForm.cost as number)
    ) {
      window.alert('لطفاً مبلغ سرویس را وارد کنید (صفر هم قابل قبول است).');
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
    const proceed = window.confirm('آیا از حذف این سرویس مطمئن هستید؟');
    if (!proceed) return;

    const linkedExpense = expenses.find(
      (e) => e.maintenanceId === id || e.id === id
    );
    if (linkedExpense) {
      const alsoDelete = window.confirm(
        'برای این سرویس یک تراکنش در مخارج خودرو ثبت شده است. آیا می‌خواهید آن تراکنش هم حذف شود؟'
      );
      if (alsoDelete) {
        await deleteExpense(linkedExpense.id);
      }
    }

    await deleteMaintenance(id);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) return;

    const amount =
      expenseForm.amount != null && !Number.isNaN(expenseForm.amount)
        ? Number(expenseForm.amount)
        : NaN;
    if (Number.isNaN(amount)) {
      window.alert('لطفاً مبلغ را به‌صورت عدد وارد کنید (صفر هم مجاز است).');
      return;
    }

    const category = (expenseForm.category || '').trim();
    if (!category) {
      window.alert('لطفاً بابت هزینه را مشخص کنید.');
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

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="bg-slate-800/50 rounded-xl p-5 ring-1 ring-slate-700 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">لیست خودروها</h3>
            <span className="text-xs text-slate-400">
              {loading ? 'در حال بارگذاری...' : `${vehicles.length} خودرو`}
            </span>
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
                    : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
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
                    }}
                    className="p-1 rounded-full hover:bg-slate-700 text-slate-300"
                    aria-label="ویرایش خودرو"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          'آیا از حذف این خودرو و تمام اطلاعات وابسته (بیمه و سرویس‌ها) مطمئن هستید؟'
                        )
                      ) {
                        deleteVehicle(v.id);
                      }
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

          <hr className="border-slate-700/60 my-3" />

          <form onSubmit={handleVehicleSubmit} className="space-y-3">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2">
              <PlusIcon />
              <span>{vehicleForm.id ? 'ویرایش خودرو' : 'افزودن خودرو جدید'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">نام نمایشی *</label>
                <input
                  required
                  value={vehicleForm.name || ''}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">شماره شاسی</label>
                <input
                  value={vehicleForm.chassisNumber || ''}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, chassisNumber: e.target.value })
                  }
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">VIN</label>
                <input
                  value={vehicleForm.vin || ''}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vin: e.target.value })}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
        </section>

        <section className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-5 ring-1 ring-slate-700">
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

                <div className="border-b border-slate-700 mb-4">
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
                    onDelete={deleteInsurance}
                  />
                )}
                {activeTab === 'maintenance' && (
                  <MaintenanceTab
                    records={filteredMaintenances}
                    form={maintenanceForm}
                    onChange={setMaintenanceForm}
                    onSubmit={handleMaintenanceSubmit}
                    onDelete={handleDeleteMaintenanceWithExpense}
                  />
                )}
                {activeTab === 'expenses' && (
                  <ExpensesTab
                    records={filteredExpenses}
                    form={expenseForm}
                    onChange={setExpenseForm}
                    onSubmit={handleExpenseSubmit}
                    onDelete={deleteExpense}
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
    </div>
  );
};

const VehicleImagePreview: React.FC<{ imageRef: string }> = ({ imageRef }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      if (imageRef && isImageRef(imageRef)) {
        const objUrl = await getObjectURLByRef(imageRef);
        if (objUrl) {
          setUrl(objUrl);
          revoke = objUrl;
        }
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [imageRef]);

  if (!imageRef) return null;

  return (
    <div className="w-32 h-24 rounded-lg overflow-hidden bg-slate-900/60 border border-slate-700 flex items-center justify-center">
      {url ? (
        <img src={url} alt="تصویر خودرو" className="w-full h-full object-cover" />
      ) : (
        <FileTextIcon />
      )}
    </div>
  );
};

const SpecsTab: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => (
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

const SpecItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex flex-col bg-slate-900/40 rounded-md px-3 py-2 border border-slate-800">
    <span className="text-xs text-slate-400 mb-1">{label}</span>
    <span className="text-slate-100">{value || '-'}</span>
  </div>
);

interface InsuranceTabProps {
  insurances: VehicleInsurance[];
  form: Partial<VehicleInsurance>;
  onChange: (f: Partial<VehicleInsurance>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onDelete: (id: string) => Promise<void>;
}

const InsuranceTab: React.FC<InsuranceTabProps> = ({
  insurances,
  form,
  onChange,
  onSubmit,
  onDelete,
}) => (
  <div className="space-y-4">
    <form onSubmit={onSubmit} className="bg-slate-900/40 rounded-lg p-4 border border-slate-800 space-y-3">
      <h4 className="font-semibold text-slate-100 flex items-center gap-2">
        <PlusIcon />
        <span>افزودن / ویرایش بیمه</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <label className="block text-xs text-slate-400 mb-1">نوع بیمه</label>
          <select
            value={form.type || 'third_party'}
            onChange={(e) =>
              onChange({ ...form, type: e.target.value as VehicleInsuranceType })
            }
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
          >
            <option value="third_party">شخص ثالث</option>
            <option value="body">بیمه بدنه</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">شرکت بیمه</label>
          <input
            value={form.company || ''}
            onChange={(e) => onChange({ ...form, company: e.target.value })}
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
            placeholder="ایران، آسیا، دی، ..."
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">شماره بیمه‌نامه</label>
          <input
            value={form.policyNumber || ''}
            onChange={(e) => onChange({ ...form, policyNumber: e.target.value })}
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">تاریخ شروع</label>
          <div className="flex items-center bg-slate-900/60 border border-slate-700 rounded-md px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
            <div className="flex-1">
              <JalaliDatePicker
                id="vehicle-ins-start"
                value={form.startDate || new Date().toISOString()}
                onChange={(iso) =>
                  onChange({
                    ...form,
                    startDate: iso.slice(0, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">تاریخ پایان</label>
          <div className="flex items-center bg-slate-900/60 border border-slate-700 rounded-md px-3 py-1.5">
            <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
            <div className="flex-1">
              <JalaliDatePicker
                id="vehicle-ins-end"
                value={form.endDate || new Date().toISOString()}
                onChange={(iso) =>
                  onChange({
                    ...form,
                    endDate: iso.slice(0, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">درصد تخفیف</label>
          <input
            type="number"
            value={form.discountPercent ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                discountPercent: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
            placeholder="مثلاً ۷۰"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">مبلغ حق بیمه (تومان)</label>
          <input
            type="number"
            value={form.premiumAmount ?? ''}
            onChange={(e) =>
              onChange({
                ...form,
                premiumAmount: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">
            توضیحات پوشش‌ها (سرقت، آتش‌سوزی، سرنشین و ...)
          </label>
          <textarea
            rows={2}
            value={form.coverageDescription || ''}
            onChange={(e) =>
              onChange({ ...form, coverageDescription: e.target.value })
            }
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            فایل بیمه‌نامه (PDF / تصویر)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const ref = await fileToImageRef(file);
              onChange({ ...form, documentRef: ref });
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
          <span>{form.id ? 'ذخیره بیمه' : 'افزودن بیمه'}</span>
        </button>
      </div>
    </form>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insurances.map((ins) => (
        <article
          key={ins.id}
          className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col space-y-2"
        >
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-slate-100">
              {ins.type === 'third_party' ? 'بیمه شخص ثالث' : 'بیمه بدنه'}
            </h5>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm('آیا از حذف این بیمه‌نامه مطمئن هستید؟ این عمل قابل بازگشت نیست.')
                ) {
                  onDelete(ins.id);
                }
              }}
              className="p-1 rounded-full hover:bg-slate-800 text-rose-400"
            >
              <DeleteIcon />
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {ins.company || '-'} {ins.policyNumber && ` | شماره: ${ins.policyNumber}`}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {formatDateLabel(ins.startDate)} تا {formatDateLabel(ins.endDate)}
            </span>
          </p>
          <p className="text-xs text-slate-400">
            تخفیف: {ins.discountPercent != null ? `${ins.discountPercent}%` : '-'}
          </p>
          <p className="text-xs text-slate-400">
            مبلغ حق بیمه: {ins.premiumAmount != null ? `${ins.premiumAmount.toLocaleString()} تومان` : '-'}
          </p>
          {ins.coverageDescription && (
            <p className="text-xs text-slate-300 border-t border-slate-800/60 pt-2 mt-2">
              {ins.coverageDescription}
            </p>
          )}
          {ins.documentRef && (
            <InsuranceDocumentLink documentRef={ins.documentRef} />
          )}
        </article>
      ))}
      {insurances.length === 0 && (
        <p className="text-sm text-slate-400">
          هنوز هیچ بیمه‌ای برای این خودرو ثبت نشده است.
        </p>
      )}
    </div>
  </div>
);

const InsuranceDocumentLink: React.FC<{ documentRef: string }> = ({ documentRef }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      if (documentRef && isImageRef(documentRef)) {
        const u = await getObjectURLByRef(documentRef);
        if (u) {
          setUrl(u);
          revoke = u;
        }
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [documentRef]);

  if (!documentRef) return null;
  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 text-xs mt-1 ${
        url ? 'text-sky-400 hover:text-sky-300' : 'text-slate-500 cursor-default'
      }`}
    >
      <FileTextIcon />
      <span>مشاهده بیمه‌نامه</span>
    </a>
  );
};

interface MaintenanceTabProps {
  records: VehicleMaintenanceRecord[];
  form: Partial<VehicleMaintenanceRecord>;
  onChange: (f: Partial<VehicleMaintenanceRecord>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onDelete: (id: string) => Promise<void>;
}

const MaintenanceTab: React.FC<MaintenanceTabProps> = ({
  records,
  form,
  onChange,
  onSubmit,
  onDelete,
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
          <div className="flex items-center bg-slate-900/60 border border-slate-700 rounded-md px-3 py-1.5">
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
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
              className="flex-1 bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
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
          <div className="flex items-center bg-slate-900/60 border border-slate-700 rounded-md px-3 py-1.5">
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
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">یادداشت / توضیحات تکمیلی</label>
          <textarea
            rows={2}
            value={form.notes || ''}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
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
          className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col space-y-2"
        >
            <div className="flex items-center justify-between gap-2">
              <h5 className="font-semibold text-slate-100">
                سرویس در {formatDateLabel(r.serviceDate)}
              </h5>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
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
                  onClick={() => onDelete(r.id)}
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

interface ExpensesTabProps {
  records: VehicleExpense[];
  form: Partial<VehicleExpense>;
  onChange: (f: Partial<VehicleExpense>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  onDelete: (id: string) => Promise<void>;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({
  records,
  form,
  onChange,
  onSubmit,
  onDelete,
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

  const handleSelectCategory = (label: string) => {
    onChange({ ...form, category: label });
  };

  return (
    <div className="space-y-4">
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
                  ...form,
                  amount: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              تاریخ هزینه *
            </label>
            <div className="flex items-center bg-slate-900/60 border border-slate-700 rounded-md px-3 py-1.5">
              <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
              <div className="flex-1">
                <JalaliDatePicker
                  id="vehicle-expense-date"
                  value={form.date || new Date().toISOString()}
                  onChange={(iso) =>
                    onChange({
                      ...form,
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
                  ...form,
                  category: e.target.value,
                })
              }
              className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 mt-1"
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
                onChange({ ...form, description: e.target.value })
              }
              className="w-full bg-slate-900/60 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 resize-none"
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
                onChange({ ...form, attachmentRef: ref });
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.map((r) => (
          <article
            key={r.id}
            className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex flex-col space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <h5 className="font-semibold text-slate-100">
                {r.category} - {r.amount.toLocaleString()} تومان
              </h5>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      id: r.id,
                      vehicleId: r.vehicleId,
                      date: r.date,
                      amount: r.amount,
                      category: r.category,
                      description: r.description,
                      attachmentRef: r.attachmentRef,
                      maintenanceId: r.maintenanceId,
                    });
                  }}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                  aria-label="ویرایش هزینه"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('آیا از حذف این هزینه مطمئن هستید؟')) {
                      onDelete(r.id);
                    }
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
        {records.length === 0 && (
          <p className="text-sm text-slate-400">
            هنوز هیچ هزینه‌ای برای این خودرو ثبت نشده است.
          </p>
        )}
      </div>
    </div>
  );
};


