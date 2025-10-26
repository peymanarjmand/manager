import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { AccountantData, Transaction, Asset, Person, LedgerEntry, InstallmentPlan, InstallmentPayment, Check, CheckStatus, DarfakExpense } from './types';
import { TRANSACTION_CATEGORIES } from './constants';
import { SummaryIcon, TransactionsIcon, AssetsIcon, PeopleIcon, InstallmentsIcon, ChecksIcon, BackIcon, PlusIcon, EditIcon, DeleteIcon, CloseIcon, DefaultImageIcon, UserCircleIcon, CheckCircleIcon, UncheckedCircleIcon, ArrowRightIcon } from '../../components/Icons';
import DarfakView from './DarfakView';
import { useAccountantStore } from './store';
import { isImageRef, saveImageDataURL, getObjectURLByRef } from '../../lib/idb-images';

// CONFIG
type AccountantTab = 'summary' | 'transactions' | 'assets' | 'people' | 'installments' | 'checks' | 'darfak';
type ModalConfig = { isOpen: boolean; type?: 'transaction' | 'asset' | 'person' | 'ledger' | 'installmentPlan' | 'installmentPayment' | 'check'; payload?: any };

// HELPERS
const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString('fa-IR')} تومان`;
const formatDate = (date: string) => moment(date).locale('fa').format('dddd، jD jMMMM jYYYY');

// Reusable Form Components
const FormInput = ({ label, id, value, onChange, type = 'text', required = false, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={id}
            name={id}
            value={value || ''}
            onChange={onChange}
            required={required}
            className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
            {...props}
        />
    </div>
);
const FormSelect = ({ label, id, value, onChange, children, required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <select
            id={id}
            name={id}
            value={value || ''}
            onChange={onChange}
            required={required}
            className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
        >
            {children}
        </select>
    </div>
);
const FormTextarea = ({ label, id, value, onChange, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <textarea id={id} name={id} value={value || ''} onChange={onChange} rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" {...props} />
    </div>
);
const FormImageUpload = ({ label, preview, onChange }) => (
     <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <div className="mt-1 flex items-center space-x-4 space-x-reverse">
            <span className="h-20 w-20 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <DefaultImageIcon />}
            </span>
            <label htmlFor="file-upload" className="cursor-pointer bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-md hover:bg-slate-600 transition">
                <span>بارگذاری تصویر</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onChange} accept="image/*"/>
            </label>
        </div>
    </div>
);

// Helper to render images that may be base64 or IndexedDB refs
const ImageFromRef = ({ srcOrRef, alt, className }: { srcOrRef?: string; alt?: string; className?: string }) => {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    let toRevoke: string | null = null;
    (async () => {
      if (isImageRef(srcOrRef)) {
        const u = await getObjectURLByRef(srcOrRef);
        if (!active) return;
        setUrl(u);
        toRevoke = u;
      } else {
        setUrl(srcOrRef || null);
      }
    })();
    return () => {
      active = false;
      if (toRevoke) URL.revokeObjectURL(toRevoke);
    };
  }, [srcOrRef]);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
};

// Custom Jalali Date Picker
const Select = ({ id, value, onChange, children }) => (
    <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
    >
        {children}
    </select>
);

const JalaliDatePicker = ({ value, onChange, id, label }) => {
    const m = useMemo(() => moment(value), [value]);
    const isValidDate = m.isValid();

    const [jYear, setJYear] = useState(() => isValidDate ? m.jYear() : moment().jYear());
    const [jMonth, setJMonth] = useState(() => isValidDate ? m.jMonth() : moment().jMonth()); // 0-indexed
    const [jDay, setJDay] = useState(() => isValidDate ? m.jDate() : moment().jDate());

    useEffect(() => {
        const newMoment = moment(value);
        if (newMoment.isValid()) {
            if (newMoment.jYear() !== jYear) setJYear(newMoment.jYear());
            if (newMoment.jMonth() !== jMonth) setJMonth(newMoment.jMonth());
            if (newMoment.jDate() !== jDay) setJDay(newMoment.jDate());
        }
    }, [value]);

    const handlePartChange = (part, newValue) => {
        let year = jYear;
        let month = jMonth;
        let day = jDay;

        if (part === 'year') year = newValue;
        if (part === 'month') month = newValue;
        if (part === 'day') day = newValue;
        
        const daysInNewMonth = moment.jDaysInMonth(year, month);
        if (day > daysInNewMonth) {
            day = daysInNewMonth;
        }
        
        const finalMoment = moment(`${year}/${month + 1}/${day}`, 'jYYYY/jM/jD');
        onChange(finalMoment.toISOString());
    };
    
    const currentJYear = moment().jYear();
    const years = Array.from({ length: 20 }, (_, i) => currentJYear - 10 + i);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);
    const daysInSelectedMonth = moment.jDaysInMonth(jYear, jMonth);
    const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

    return (
        <div>
            <label htmlFor={`${id}-year`} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <div className="grid grid-cols-3 gap-2">
                <Select id={`${id}-day`} value={jDay} onChange={(e) => handlePartChange('day', parseInt(e.target.value, 10))}>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select id={`${id}-month`} value={jMonth} onChange={(e) => handlePartChange('month', parseInt(e.target.value, 10))}>
                    {months.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </Select>
                <Select id={`${id}-year`} value={jYear} onChange={(e) => handlePartChange('year', parseInt(e.target.value, 10))}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
            </div>
        </div>
    );
};


// Form Modal Component
const AccountantFormModal = ({ isOpen, onClose, onSave, type, payload }: {isOpen: boolean, onClose: () => void, onSave: (type:string, data:any)=>void, type?:string, payload?:any}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState(payload || {});
    const [imagePreview, setImagePreview] = useState(payload?.receiptImage || payload?.avatar || null);

     useEffect(() => {
        const isoNow = new Date().toISOString();
        let defaultData: any = {};
        if (payload) {
             const newPayload = {...payload};
             if ((type === 'transaction' || type === 'ledger' || type === 'installmentPayment' || type === 'check') && !moment(newPayload.date || newPayload.dueDate).isValid()) {
                if(type === 'installmentPayment' || type === 'check') newPayload.dueDate = isoNow;
                else newPayload.date = isoNow;
             }
             if (type === 'asset' && !moment(newPayload.purchaseDate).isValid()) {
                 newPayload.purchaseDate = isoNow;
             }
             setFormData(newPayload);
        } else {
             switch(type) {
                case 'transaction': defaultData = {date: isoNow, type: 'expense', category: TRANSACTION_CATEGORIES.expense[0]}; break;
                case 'asset': defaultData = {purchaseDate: isoNow}; break;
                case 'person': defaultData = {}; break;
                case 'ledger': defaultData = {date: isoNow, type: 'debt'}; break;
                case 'installmentPlan': defaultData = {firstPaymentDate: isoNow}; break;
                case 'check': defaultData = {dueDate: isoNow, type: 'issued', status: 'pending'}; break;
             }
             setFormData(defaultData);
        }
        // Resolve existing payload image (if any) to preview, supporting IDB refs
        (async () => {
            const p = payload?.receiptImage || payload?.avatar || null;
            if (isImageRef(p)) {
                const url = await getObjectURLByRef(p);
                setImagePreview(url);
            } else {
                setImagePreview(p || null);
            }
        })();
    }, [isOpen, type, payload]);


    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'type' && (type === 'transaction')) {
                newState.category = TRANSACTION_CATEGORIES[value][0];
            }
            return newState;
        });
    };
    
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                try {
                    const ref = await saveImageDataURL(base64String);
                    if(type === 'person') setFormData(prev => ({...prev, avatar: ref}));
                    else setFormData(prev => ({...prev, receiptImage: ref}));
                    const url = await getObjectURLByRef(ref);
                    setImagePreview(url);
                } catch (err) {
                    console.error('Failed to save image to IDB', err);
                    setImagePreview(base64String);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(type, formData);
    };

    const getTitle = () => {
        const action = payload?.id ? "ویرایش" : "افزودن";
        switch (type) {
            case 'transaction': return `${action} تراکنش`;
            case 'asset': return `${action} دارایی`;
            case 'person': return `${action} شخص`;
            case 'ledger': return `${action} حساب`;
            case 'installmentPlan': return `${action} قسط`;
            case 'installmentPayment': return `ویرایش پرداخت قسط`;
            case 'check': return `${action} چک`;
            default: return "فرم";
        }
    }
    
    const renderTransactionFields = () => (
        <>
            <FormSelect label="نوع" id="type" value={formData.type} onChange={handleChange} required>
                <option value="expense">هزینه</option>
                <option value="income">درآمد</option>
            </FormSelect>
            <FormSelect label="دسته بندی" id="category" value={formData.category} onChange={handleChange} required>
                {(formData.type === 'income' ? TRANSACTION_CATEGORIES.income : TRANSACTION_CATEGORIES.expense).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </FormSelect>
            <FormInput label="مبلغ" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
            <FormInput label="توضیحات" id="description" value={formData.description} onChange={handleChange} required />
            <JalaliDatePicker label="تاریخ" id="date" value={formData.date} onChange={(isoDate) => setFormData(p => ({...p, date: isoDate}))} />
            <FormImageUpload label="رسید" preview={imagePreview} onChange={handleImageChange} />
        </>
    );
    const renderAssetFields = () => (
        <>
            <FormInput label="نام دارایی" id="name" value={formData.name} onChange={handleChange} required />
            <FormInput label="ارزش فعلی (تومان)" id="currentValue" type="number" value={formData.currentValue} onChange={handleChange} required />
            <FormInput label="مقدار" id="quantity" type="number" value={formData.quantity} onChange={handleChange} placeholder="مثلا: 2 سکه یا 0.1 بیت‌کوین" required />
            <JalaliDatePicker label="تاریخ خرید" id="purchaseDate" value={formData.purchaseDate} onChange={(isoDate) => setFormData(p => ({...p, purchaseDate: isoDate}))} />
            <FormTextarea label="یادداشت" id="notes" value={formData.notes} onChange={handleChange} />
        </>
    );
    const renderPersonFields = () => (
        <>
            <FormInput label="نام شخص" id="name" value={formData.name} onChange={handleChange} required />
            <FormImageUpload label="آواتار" preview={imagePreview} onChange={handleImageChange} />
        </>
    );
    const renderLedgerFields = () => (
         <>
            <FormSelect label="نوع" id="type" value={formData.type} onChange={handleChange} required>
                <option value="debt">طلب (او به من بدهکار است)</option>
                <option value="credit">بدهی (من به او بدهکارم)</option>
            </FormSelect>
            <FormInput label="مبلغ" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
            <FormInput label="توضیحات" id="description" value={formData.description} onChange={handleChange} required />
            <JalaliDatePicker label="تاریخ" id="date" value={formData.date} onChange={(isoDate) => setFormData(p => ({...p, date: isoDate}))} />
            <FormImageUpload label="رسید" preview={imagePreview} onChange={handleImageChange} />
        </>
    );
    const renderInstallmentPlanFields = () => (
        <>
            <FormInput label="عنوان" id="title" value={formData.title} onChange={handleChange} placeholder="مثلا خرید گوشی" required />
            <FormInput label="مبلغ کل وام/خرید" id="loanAmount" type="number" value={formData.loanAmount} onChange={handleChange} placeholder="مبلغ دریافت شده" />
            <FormInput label="مبلغ هر قسط" id="paymentAmount" type="number" value={formData.paymentAmount} onChange={handleChange} required={!formData.id} />
            <FormInput label="تعداد اقساط" id="installmentsCount" type="number" value={formData.installmentsCount} onChange={handleChange} min="1" required={!formData.id} />
            <JalaliDatePicker label="تاریخ اولین پرداخت" id="firstPaymentDate" value={formData.firstPaymentDate} onChange={(isoDate) => setFormData(p => ({...p, firstPaymentDate: isoDate}))} />
        </>
    );
    const renderInstallmentPaymentFields = () => (
        <>
             <FormInput label="مبلغ قسط" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
             <FormInput label="جریمه (تومان)" id="penalty" type="number" value={formData.penalty} onChange={handleChange} placeholder="اختیاری" />
             <JalaliDatePicker label="تاریخ سررسید" id="dueDate" value={formData.dueDate} onChange={(isoDate) => setFormData(p => ({...p, dueDate: isoDate}))} />
        </>
    );
     const renderCheckFields = () => (
        <>
            <FormSelect label="نوع چک" id="type" value={formData.type} onChange={handleChange} required>
                <option value="issued">صادره</option>
                <option value="received">دریافتی</option>
            </FormSelect>
             <FormInput label="مبلغ" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
            <JalaliDatePicker label="تاریخ سررسید" id="dueDate" value={formData.dueDate} onChange={(isoDate) => setFormData(p => ({...p, dueDate: isoDate}))} />

            {formData.type === 'issued' ? (
                <>
                    <FormInput label="در وجه" id="payeeName" value={formData.payeeName} onChange={handleChange} required />
                    <FormInput label="کد ملی گیرنده (اختیاری)" id="payeeNationalId" value={formData.payeeNationalId} onChange={handleChange} />
                </>
            ) : (
                 <>
                    <FormInput label="صادر کننده" id="drawerName" value={formData.drawerName} onChange={handleChange} required />
                    <FormInput label="کد ملی صادر کننده (اختیاری)" id="drawerNationalId" value={formData.drawerNationalId} onChange={handleChange} />
                </>
            )}

            <FormInput label="بابت" id="subject" value={formData.subject} onChange={handleChange} required />
            <FormInput label="شناسه صیادی (۱۶ رقم)" id="sayyadId" value={formData.sayyadId} onChange={handleChange} maxLength="16" required />
            <FormTextarea label="توضیحات (اختیاری)" id="description" value={formData.description} onChange={handleChange} />
        </>
    );
    
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleSubmit} name="accountantForm">
                  <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                      <h3 className="text-xl font-bold text-slate-100">{getTitle()}</h3>
                      <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                          <CloseIcon />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      {type === 'transaction' && renderTransactionFields()}
                      {type === 'asset' && renderAssetFields()}
                      {type === 'person' && renderPersonFields()}
                      {type === 'ledger' && renderLedgerFields()}
                      {type === 'installmentPlan' && renderInstallmentPlanFields()}
                      {type === 'installmentPayment' && renderInstallmentPaymentFields()}
                      {type === 'check' && renderCheckFields()}
                  </div>
                  <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                      <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition">لغو</button>
                      <button type="submit" className="py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400">ذخیره</button>
                  </div>
              </form>
          </div>
      </div>
    );
};

// Main Component
export const SmartAccountant = ({ onNavigateBack }: { onNavigateBack: () => void; }): React.ReactNode => {
    const [activeTab, setActiveTab] = useState<AccountantTab>('summary');
    const [modal, setModal] = useState<ModalConfig>({ isOpen: false });
    const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
    const [currentInstallment, setCurrentInstallment] = useState<InstallmentPlan | null>(null);

    const data = useAccountantStore();
    const actions = useAccountantStore.getState();

    useEffect(() => {
        if(activeTab !== 'people') setCurrentPerson(null);
        if(activeTab !== 'installments') setCurrentInstallment(null);
    }, [activeTab]);
    
    useEffect(() => {
        if (currentInstallment) {
            const updatedPlan = data.installments.find(p => p.id === currentInstallment.id);
            if (updatedPlan && JSON.stringify(updatedPlan) !== JSON.stringify(currentInstallment)) {
                setCurrentInstallment(updatedPlan);
            } else if (!updatedPlan) {
                setCurrentInstallment(null);
            }
        }
    }, [data.installments, currentInstallment]);


    const openModal = (type: ModalConfig['type'], payload = null) => setModal({ isOpen: true, type, payload });
    const closeModal = () => setModal({ isOpen: false });

    const handleSave = (itemType: string, itemData: any) => {
        const id = itemData.id || Date.now().toString();
    
        switch (itemType) {
            case 'transaction':
                actions.saveTransaction({ ...itemData, id, amount: parseFloat(itemData.amount) || 0 });
                break;
            case 'asset':
                actions.saveAsset({ ...itemData, id, currentValue: parseFloat(itemData.currentValue) || 0, quantity: parseFloat(itemData.quantity) || 0 });
                break;
            case 'person':
                actions.savePerson({ ...itemData, id });
                break;
            case 'ledger':
                actions.saveLedgerEntry({ ...itemData, id, amount: parseFloat(itemData.amount) || 0 });
                break;
            case 'installmentPlan': {
                const { title, loanAmount, paymentAmount, installmentsCount, firstPaymentDate, id: planId } = itemData;
                if (planId) { 
                    actions.updateInstallmentPlan({ id: planId, title, loanAmount: parseFloat(loanAmount) || 0 });
                } else { 
                    const newPlanId = Date.now().toString();
                    const payments: InstallmentPayment[] = Array.from({ length: parseInt(installmentsCount, 10) || 0 }, (_, i) => ({
                        id: `${newPlanId}-${i}`,
                        dueDate: moment(firstPaymentDate).add(i, 'jMonth').toISOString(),
                        amount: parseFloat(paymentAmount) || 0,
                        isPaid: false,
                    }));
                    const newPlan: InstallmentPlan = { id: newPlanId, title, payments, loanAmount: parseFloat(loanAmount) || 0 };
                    actions.saveInstallmentPlan(newPlan);
                }
                break;
            }
            case 'installmentPayment': {
                const { planId, id: paymentId, amount, dueDate, penalty } = itemData;
                actions.updateInstallmentPayment(planId, { id: paymentId, amount: parseFloat(amount) || 0, dueDate, penalty: parseFloat(penalty) || 0 });
                break;
            }
            case 'check': {
                actions.saveCheck({ 
                    ...itemData, 
                    id, 
                    amount: parseFloat(itemData.amount) || 0,
                    status: itemData.status || 'pending'
                });
                break;
            }
        }
        closeModal();
    };

    const handleDelete = (itemType: string, id: string, personId?: string) => {
        if (!window.confirm("آیا از حذف این مورد اطمینان دارید؟")) return;
        switch (itemType) {
            case 'transaction':
                actions.deleteTransaction(id);
                break;
            case 'asset':
                actions.deleteAsset(id);
                break;
            case 'person':
                actions.deletePerson(id);
                break;
            case 'ledger':
                if (personId) actions.deleteLedgerEntry(personId, id);
                break;
            case 'installmentPlan':
                actions.deleteInstallmentPlan(id);
                setCurrentInstallment(null);
                break;
            case 'check':
                actions.deleteCheck(id);
                break;
        }
    };
    
    const handleSettle = (personId: string, ledgerId: string) => {
       actions.toggleSettle(personId, ledgerId);
    }
    
    const handleTogglePaidStatus = (planId: string, paymentId: string) => {
       actions.togglePaidStatus(planId, paymentId);
    }

     const handleUpdateCheckStatus = (checkId: string, status: CheckStatus) => {
       actions.updateCheckStatus(checkId, status);
    }

    const handleAddButtonClick = () => {
        let modalType: ModalConfig['type'] = undefined;
        let payload: any = null;

        switch (activeTab) {
            case 'summary':
            case 'transactions':
                modalType = 'transaction';
                break;
            case 'assets':
                modalType = 'asset';
                break;
            case 'people':
                if (currentPerson) {
                    modalType = 'ledger';
                    payload = { personId: currentPerson.id };
                } else {
                    modalType = 'person';
                }
                break;
            case 'installments':
                 if (!currentInstallment) modalType = 'installmentPlan';
                break;
            case 'checks':
                modalType = 'check';
                break;
        }
        if (modalType) {
            openModal(modalType, payload);
        }
    };

    const isAddButtonDisabled = (activeTab === 'installments' && !!currentInstallment);

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <AccountantFormModal isOpen={modal.isOpen} onClose={closeModal} onSave={handleSave} type={modal.type} payload={modal.payload} />
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onNavigateBack} className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg transition" title="بازگشت به داشبورد">
                        <BackIcon />
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">حسابدار هوشمند</h2>
                </div>
                 <button onClick={handleAddButtonClick} className="w-full sm:w-auto flex items-center justify-center space-x-2 space-x-reverse bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddButtonDisabled}
                  >
                    <PlusIcon />
                    <span>{currentPerson ? "افزودن حساب جدید" : (activeTab === 'installments' && !currentInstallment) ? "افزودن قسط جدید" : "افزودن"}</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex space-x-4 space-x-reverse overflow-x-auto" aria-label="Tabs">
                        {[
                            { id: 'summary', title: 'خلاصه', icon: <SummaryIcon /> },
                            { id: 'transactions', title: 'تراکنش‌ها', icon: <TransactionsIcon /> },
                            { id: 'checks', title: 'چک‌ها', icon: <ChecksIcon /> },
                            { id: 'installments', title: 'اقساط', icon: <InstallmentsIcon /> },
                            { id: 'assets', title: 'دارایی‌ها', icon: <AssetsIcon /> },
                            { id: 'people', title: 'حساب با دیگران', icon: <PeopleIcon /> },
                            { id: 'darfak', title: 'درفک (ساخت‌وساز)', icon: <TransactionsIcon /> },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as AccountantTab)}
                                className={`${activeTab === tab.id ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}
                                whitespace-nowrap flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}>
                                <span className="ml-2">{tab.icon}</span>
                                {tab.title}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'summary' && <SummaryView data={data} />}
                {activeTab === 'transactions' && <TransactionsView transactions={data.transactions} onEdit={(t) => openModal('transaction', t)} onDelete={(id) => handleDelete('transaction', id)} />}
                {activeTab === 'checks' && <ChecksView checks={data.checks} onEdit={(c) => openModal('check', c)} onDelete={(id) => handleDelete('check', id)} onStatusChange={handleUpdateCheckStatus} />}
                {activeTab === 'installments' && <InstallmentsView installments={data.installments} currentInstallment={currentInstallment} setCurrentInstallment={setCurrentInstallment} onEditPlan={(plan) => openModal('installmentPlan', plan)} onDeletePlan={(id) => handleDelete('installmentPlan', id)} onEditPayment={(p) => openModal('installmentPayment', p)} onTogglePaidStatus={handleTogglePaidStatus} />}
                {activeTab === 'assets' && <AssetsView assets={data.assets} onEdit={(a) => openModal('asset', a)} onDelete={(id) => handleDelete('asset', id)} />}
                {activeTab === 'people' && <PeopleView data={data} onEditPerson={(p) => openModal('person', p)} onDeletePerson={(id) => handleDelete('person', id)} onEditLedger={(l) => openModal('ledger', l)} onDeleteLedger={(personId, ledgerId) => handleDelete('ledger', ledgerId, personId)} onSettle={handleSettle} currentPerson={currentPerson} setCurrentPerson={setCurrentPerson} />}
                {activeTab === 'darfak' && <DarfakView />}
            </div>
        </div>
    );
};


// VIEW COMPONENTS

const SummaryView = ({ data }: { data: AccountantData }) => {
    const thirtyDaysAgo = moment().subtract(30, 'days');

    const totalAssets = useMemo(() => data.assets.reduce((sum, asset) => sum + (asset.currentValue * (asset.quantity || 1)), 0), [data.assets]);
    
    const recentIncome = useMemo(() => data.transactions
        .filter(t => t.type === 'income' && moment(t.date).isAfter(thirtyDaysAgo))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions]);

    const recentExpenses = useMemo(() => data.transactions
        .filter(t => t.type === 'expense' && moment(t.date).isAfter(thirtyDaysAgo))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions]);
    
    const { totalDebt, totalCredit } = useMemo(() => {
        let debt = 0;
        let credit = 0;
        Object.values(data.ledger).flat().forEach(entry => {
            if (!entry.isSettled) {
                if (entry.type === 'debt') debt += entry.amount;
                else credit += entry.amount;
            }
        });
        return { totalDebt: debt, totalCredit: credit };
    }, [data.ledger]);

    const monthlyInstallments = useMemo(() => {
        const startOfMonth = moment().startOf('jMonth');
        const endOfMonth = moment().endOf('jMonth');

        const allPaymentsThisMonth = data.installments.flatMap(plan => plan.payments)
            .filter(payment => moment(payment.dueDate).isBetween(startOfMonth, endOfMonth, undefined, '[]'));

        const paidAmount = allPaymentsThisMonth
            .filter(p => p.isPaid)
            .reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);

        const totalAmount = allPaymentsThisMonth.reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);

        const unpaidAmount = totalAmount - paidAmount;
        
        const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

        return {
            totalAmount,
            paidAmount,
            unpaidAmount,
            progress,
            hasInstallments: allPaymentsThisMonth.length > 0
        };
    }, [data.installments]);
    
    const monthlyIssuedChecks = useMemo(() => {
        const startOfMonth = moment().startOf('jMonth');
        const endOfMonth = moment().endOf('jMonth');

        return data.checks
            .filter(c => c.type === 'issued' && c.status === 'pending' && moment(c.dueDate).isBetween(startOfMonth, endOfMonth, undefined, '[]'))
            .reduce((sum, c) => sum + c.amount, 0);
    }, [data.checks]);

    const netWorth = totalAssets + totalDebt - totalCredit;
    
    const StatCard = ({ title, value, colorClass }) => (
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
            <h3 className="text-slate-400 text-md">{title}</h3>
            <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{formatCurrency(value)}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="ارزش خالص دارایی‌ها" value={netWorth} colorClass="text-sky-400" />
                <StatCard title="درآمد ۳۰ روز اخیر" value={recentIncome} colorClass="text-emerald-400" />
                <StatCard title="هزینه ۳۰ روز اخیر" value={recentExpenses} colorClass="text-rose-400" />
            </div>

            {monthlyInstallments.hasInstallments && (
                <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
                    <h3 className="text-slate-300 text-lg font-semibold mb-4">
                        خلاصه اقساط این ماه ({moment().locale('fa').format('jMMMM')})
                    </h3>
                    <div className="w-full bg-slate-700 rounded-full h-4 mb-2 overflow-hidden">
                        <div 
                            className="bg-emerald-500 h-4 rounded-full transition-all duration-500" 
                            style={{ width: `${monthlyInstallments.progress}%` }}
                            role="progressbar"
                            aria-valuenow={monthlyInstallments.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        ></div>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                        <div className="text-emerald-400">
                            <span>پرداخت شده: </span>
                            <span>{formatCurrency(monthlyInstallments.paidAmount)}</span>
                        </div>
                        <div className="text-rose-400">
                            <span>مانده: </span>
                            <span>{formatCurrency(monthlyInstallments.unpaidAmount)}</span>
                        </div>
                    </div>
                    <div className="text-center text-slate-200 mt-3 font-bold text-base">
                        <span>مجموع: </span>
                        <span>{formatCurrency(monthlyInstallments.totalAmount)}</span>
                    </div>
                </div>
            )}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <StatCard title="مجموع طلب شما از دیگران" value={totalDebt} colorClass="text-emerald-400" />
                 <StatCard title="مجموع بدهی شما به دیگران" value={totalCredit} colorClass="text-rose-400" />
                 <StatCard title={`چک‌های صادره این ماه (${moment().locale('fa').format('jMMMM')})`} value={monthlyIssuedChecks} colorClass="text-amber-400" />
             </div>
        </div>
    )
};

const TransactionsView = ({ transactions, onEdit, onDelete }) => {
    const income = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');
    
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold mb-4 text-emerald-400">درآمدها</h3>
                {income.length > 0 ? (
                    <TransactionList transactions={income} onEdit={onEdit} onDelete={onDelete} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg">هنوز درآمدی ثبت نشده است.</p>}
            </div>
             <div>
                <h3 className="text-2xl font-bold mb-4 text-rose-400">هزینه‌ها</h3>
                {expenses.length > 0 ? (
                    <TransactionList transactions={expenses} onEdit={onEdit} onDelete={onDelete} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg">هنوز هزینه‌ای ثبت نشده است.</p>}
            </div>
        </div>
    );
};

const TransactionList = ({ transactions, onEdit, onDelete }) => (
    <div className="space-y-3">
        {transactions.map(t => (
            <div key={t.id} className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50">
                <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                    {t.receiptImage && (
                        <ImageFromRef srcOrRef={t.receiptImage} className="h-12 w-12 rounded-md object-cover hidden sm:block" />
                    )}
                    <div className="min-w-0">
                        <p className="font-bold text-slate-100 truncate">{t.description}</p>
                        <p className="text-sm text-slate-400 truncate">{t.category} • {formatDate(t.date)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                    <p className={`font-bold text-sm sm:text-base ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(t.amount)}</p>
                     <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                       <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                       <button onClick={() => onDelete(t.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const AssetsView = ({ assets, onEdit, onDelete }) => {
    if (assets.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز دارایی ثبت نشده است.</p>
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assets.map(asset => (
                <div key={asset.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-100 text-lg">{asset.name}</h4>
                            <p className="text-sm text-slate-400">مقدار: {asset.quantity}</p>
                        </div>
                         <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                           <button onClick={() => onEdit(asset)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                           <button onClick={() => onDelete(asset.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-sky-400">{formatCurrency(asset.currentValue * asset.quantity)}</p>
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">تاریخ خرید: {formatDate(asset.purchaseDate)}</p>
                    {asset.notes && <p className="text-sm text-slate-300">{asset.notes}</p>}
                </div>
            ))}
        </div>
    );
};

const PeopleView = ({ data, onEditPerson, onDeletePerson, onEditLedger, onDeleteLedger, onSettle, currentPerson, setCurrentPerson }) => {
    if (currentPerson) {
        const ledger = data.ledger[currentPerson.id] || [];
        const { balance } = ledger.reduce((acc, entry) => {
            if (!entry.isSettled) {
                if (entry.type === 'debt') acc.balance += entry.amount; // They owe me
                else acc.balance -= entry.amount; // I owe them
            }
            return acc;
        }, { balance: 0 });

        return (
            <div>
                 <div className="flex justify-between items-center mb-6 p-4 bg-slate-800 rounded-lg">
                    <button onClick={() => setCurrentPerson(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                        <ArrowRightIcon />
                        <span>بازگشت به لیست</span>
                    </button>
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-white">{currentPerson.name}</h3>
                        <p className={`font-semibold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {balance > 0 ? `به شما ${formatCurrency(balance)} بدهکار است.` : balance < 0 ? `شما ${formatCurrency(Math.abs(balance))} بدهکارید.` : 'حساب شما تسویه است.'}
                        </p>
                    </div>
                </div>
                {ledger.length === 0 ? <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز حسابی با {currentPerson.name} ثبت نشده.</p> :
                <div className="space-y-3">
                    {ledger.map(entry => (
                        <div key={entry.id} className={`bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 ${entry.isSettled ? 'opacity-50' : ''}`}>
                            <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-100 truncate">{entry.description}</p>
                                    <p className="text-sm text-slate-400 truncate">{formatDate(entry.date)}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                                <p className={`font-bold text-sm sm:text-base ${entry.type === 'debt' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(entry.amount)}</p>
                                <button onClick={() => onSettle(currentPerson.id, entry.id)} className="p-1.5 hover:bg-slate-700 rounded-full" title={entry.isSettled ? 'لغو تسویه' : 'تسویه'}>
                                   {entry.isSettled ? <CloseIcon /> : <CheckCircleIcon />}
                                </button>
                                <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                                   <button onClick={() => onEditLedger({...entry, personId: currentPerson.id})} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"><EditIcon/></button>
                                   <button onClick={() => onDeleteLedger(currentPerson.id, entry.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition"><DeleteIcon/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                }
            </div>
        )
    }

    if (data.people.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز شخصی برای حساب و کتاب اضافه نشده است.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.people.map(person => {
                const ledger = data.ledger[person.id] || [];
                const balance = ledger.reduce((sum, entry) => {
                    if (entry.isSettled) return sum;
                    return sum + (entry.type === 'debt' ? entry.amount : -entry.amount);
                }, 0);
                return (
                    <div key={person.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 cursor-pointer transition-all hover:ring-sky-400 hover:-translate-y-1" onClick={() => setCurrentPerson(person)}>
                        <div className="flex justify-between items-start">
                             <div className="flex items-center space-x-4 space-x-reverse">
                                <div className="w-16 h-16 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {person.avatar ? (
                                      <ImageFromRef srcOrRef={person.avatar} className="w-full h-full object-cover" alt={person.name} />
                                    ) : <UserCircleIcon />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-100 text-lg">{person.name}</h4>
                                     <p className={`text-sm font-semibold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                        {balance > 0 ? `طلب: ${formatCurrency(balance)}` : balance < 0 ? `بدهی: ${formatCurrency(Math.abs(balance))}` : 'تسویه'}
                                    </p>
                                </div>
                            </div>
                             <div className="flex flex-col items-center space-y-1 text-slate-400">
                               <button onClick={(e) => { e.stopPropagation(); onEditPerson(person);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"><EditIcon/></button>
                               <button onClick={(e) => { e.stopPropagation(); onDeletePerson(person.id);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition"><DeleteIcon/></button>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const ChecksView = ({ checks, onEdit, onDelete, onStatusChange }) => {
    const [viewType, setViewType] = useState<'issued' | 'received'>('issued');

    const sortedChecks = useMemo(() => {
        return [...checks].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [checks]);

    const issuedChecks = sortedChecks.filter(c => c.type === 'issued');
    const receivedChecks = sortedChecks.filter(c => c.type === 'received');
    const checksToDisplay = viewType === 'issued' ? issuedChecks : receivedChecks;
    
    return (
        <div className="space-y-6">
            <div className="flex justify-center mb-6 border-b border-slate-700">
                <button 
                    onClick={() => setViewType('issued')} 
                    className={`py-3 px-6 font-medium text-sm transition-colors focus:outline-none ${viewType === 'issued' ? 'border-b-2 border-sky-400 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    چک‌های صادره
                </button>
                 <button 
                    onClick={() => setViewType('received')} 
                    className={`py-3 px-6 font-medium text-sm transition-colors focus:outline-none ${viewType === 'received' ? 'border-b-2 border-sky-400 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    چک‌های دریافتی
                </button>
            </div>

            {checksToDisplay.length > 0 ? (
                <div className="space-y-4">
                    {checksToDisplay.map(check => (
                        <CheckCard check={check} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                    <div className="text-5xl text-slate-600 mb-4"><ChecksIcon /></div>
                    <h3 className="text-xl font-semibold text-slate-200">
                        {viewType === 'issued' ? 'هنوز چک صادره‌ای ثبت نشده' : 'هنوز چک دریافتی ثبت نشده'}
                    </h3>
                    <p className="text-slate-400 mt-2">برای شروع، روی دکمه "افزودن" کلیک کنید.</p>
                </div>
            )}
        </div>
    );
};

const CheckCard = ({ check, onEdit, onDelete, onStatusChange }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = React.useRef(null);

    const statusInfo = {
        pending: { text: "در انتظار", color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
        cashed: { text: "پاس شده", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/30" },
        bounced: { text: "برگشت خورده", color: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/30" },
    };

    const handleStatusChange = (newStatus: CheckStatus) => {
        onStatusChange(check.id, newStatus);
        setIsMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    return (
        <div className={`bg-slate-800/60 rounded-xl p-4 ring-1 ring-slate-700 transition-shadow hover:shadow-lg hover:shadow-slate-900/50 ${check.status !== 'pending' ? 'opacity-70' : ''}`}>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-100 text-lg">{check.subject}</p>
                        <p className={`font-bold text-xl ${check.type === 'issued' ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {formatCurrency(check.amount)}
                        </p>
                    </div>
                    <p className="text-sm text-slate-400">
                        {check.type === 'issued' ? `در وجه: ${check.payeeName}` : `صادر کننده: ${check.drawerName}`}
                    </p>
                     <p className="text-sm text-slate-500 font-mono mt-1">شناسه صیادی: {check.sayyadId}</p>
                </div>
                <div className="flex sm:flex-col items-end justify-between gap-2">
                    <p className="font-semibold text-slate-300">{formatDate(check.dueDate)}</p>
                    <div className="flex items-center gap-2">
                         <div className="relative" ref={menuRef}>
                            <button onClick={() => setIsMenuOpen(prev => !prev)} className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo[check.status].bg} ${statusInfo[check.status].color} ring-1 ${statusInfo[check.status].ring}`}>
                                {statusInfo[check.status].text}
                            </button>
                            {isMenuOpen && (
                                <div className="absolute left-0 mt-2 w-32 bg-slate-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                    <div className="py-1">
                                        {(Object.keys(statusInfo) as CheckStatus[]).map(s => (
                                            <a key={s} href="#" onClick={(e) => { e.preventDefault(); handleStatusChange(s); }} className="block px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">
                                                {statusInfo[s].text}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => onEdit(check)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                        <button onClick={() => onDelete(check.id)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
            </div>
            {check.description && <p className="text-sm text-slate-400 pt-2 mt-2 border-t border-slate-700/50">{check.description}</p>}
        </div>
    );
}

const calculateAPR = (loanAmount: number, payments: InstallmentPayment[]): number | null => {
    if (!loanAmount || loanAmount <= 0 || payments.length === 0) {
        return null;
    }

    const totalPaymentsValue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInterest = totalPaymentsValue - loanAmount;

    if (totalInterest <= 0) {
        return 0; // No interest means 0% rate.
    }
    
    const numberOfPayments = payments.length;
    // Loan term in years, assuming monthly payments as per plan creation logic.
    const loanTermInYears = numberOfPayments / 12;

    if (loanTermInYears <= 0) {
        return null; // Avoid division by zero for termless loans with interest.
    }

    // Simple annual interest rate calculation: Rate = Interest / (Principal * Term)
    const annualRate = totalInterest / (loanAmount * loanTermInYears);

    return annualRate * 100;
};

const PlanStats = ({ plan }: { plan: InstallmentPlan }) => {
    if (!plan.loanAmount || plan.loanAmount <= 0) return null;

    const apr = calculateAPR(plan.loanAmount, plan.payments);
    const totalPaymentsValue = plan.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalInterest = totalPaymentsValue - plan.loanAmount;
    const totalPenalty = plan.payments.reduce((sum, p) => sum + (p.penalty || 0), 0);

    return (
        <div className="mt-6 mb-4 p-4 bg-slate-900/50 rounded-lg ring-1 ring-slate-700">
            <h4 className="text-lg font-semibold mb-3 text-slate-200">آمار وام</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <p className="text-slate-400">مبلغ کل وام:</p>
                <p className="text-slate-100 font-medium text-left">{formatCurrency(plan.loanAmount)}</p>
                
                <p className="text-slate-400">مجموع کل اقساط:</p>
                <p className="text-slate-100 font-medium text-left">{formatCurrency(totalPaymentsValue)}</p>

                <p className="text-slate-400">سود کل:</p>
                <p className="text-slate-100 font-medium text-left">{formatCurrency(totalInterest > 0 ? totalInterest : 0)}</p>
                
                {totalPenalty > 0 && (
                    <>
                        <p className="text-slate-400">مجموع جرائم ثبت شده:</p>
                        <p className="text-rose-400 font-medium text-left">{formatCurrency(totalPenalty)}</p>
                    </>
                )}

                <p className="text-slate-400">نرخ سود سالانه (APR):</p>
                <p className="text-sky-400 font-bold text-left">{apr !== null ? `${apr.toFixed(2)} %` : 'N/A'}</p>
            </div>
        </div>
    );
};


const InstallmentsView = ({ installments, currentInstallment, setCurrentInstallment, onEditPlan, onDeletePlan, onEditPayment, onTogglePaidStatus }) => {
    const [showPaymentsList, setShowPaymentsList] = useState(false);

    if (currentInstallment) {
        const isCompleted = currentInstallment.payments.length > 0 && currentInstallment.payments.every(p => p.isPaid);

        // Active Installment Plan Detail View
        if (!isCompleted) {
            const paidCount = currentInstallment.payments.filter(p => p.isPaid).length;
            const totalCount = currentInstallment.payments.length;
            const remainingAmount = currentInstallment.payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
            
            return (
                <div>
                    <div className="flex justify-between items-center mb-6 p-4 bg-slate-800 rounded-lg">
                        <button onClick={() => setCurrentInstallment(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                            <ArrowRightIcon />
                            <span>بازگشت به لیست اقساط</span>
                        </button>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-white">{currentInstallment.title}</h3>
                            <p className="text-slate-400">پرداخت شده: {paidCount} از {totalCount} - مانده: {formatCurrency(remainingAmount)}</p>
                        </div>
                    </div>
                    <PlanStats plan={currentInstallment} />
                    {currentInstallment.payments.length === 0 ? <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">پرداختی برای این قسط وجود ندارد.</p> :
                    <div className="space-y-3">
                        {currentInstallment.payments.map((payment, index) => (
                            <div key={payment.id} className={`bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 ${payment.isPaid ? 'opacity-60' : ''}`}>
                                <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                    <button onClick={() => onTogglePaidStatus(currentInstallment.id, payment.id)} className="p-1.5 hover:bg-slate-700 rounded-full" title={payment.isPaid ? 'علامت به عنوان پرداخت نشده' : 'علامت به عنوان پرداخت شده'}>
                                       {payment.isPaid ? <CheckCircleIcon /> : <UncheckedCircleIcon />}
                                    </button>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-100 truncate">قسط شماره {index + 1}</p>
                                        <p className="text-sm text-slate-400 truncate">{formatDate(payment.dueDate)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                                    <div className="text-left">
                                        <p className={`font-bold text-sm sm:text-base ${payment.isPaid ? 'text-slate-500 line-through' : 'text-sky-300'}`}>{formatCurrency(payment.amount)}</p>
                                        {payment.penalty > 0 && (
                                            <p className={`text-xs ${payment.isPaid ? 'text-slate-600 line-through' : 'text-rose-400'}`}>
                                                + {formatCurrency(payment.penalty)} جریمه
                                            </p>
                                        )}
                                    </div>
                                    {!payment.isPaid && (
                                         <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                                           <button onClick={() => onEditPayment({...payment, planId: currentInstallment.id})} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"><EditIcon/></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    }
                </div>
            );
        }
        
        // Completed Installment Plan Detail View
        if (isCompleted) {
            const loanAmount = currentInstallment.loanAmount || 0;
            const totalPaidPrincipal = currentInstallment.payments.reduce((sum, p) => sum + p.amount, 0);
            const stats = {
                loanAmount,
                totalPaidPrincipal,
                totalInterest: totalPaidPrincipal - loanAmount,
                totalPenalty: currentInstallment.payments.reduce((sum, p) => sum + (p.penalty || 0), 0),
                startDate: currentInstallment.payments[0]?.dueDate,
                endDate: [...currentInstallment.payments]
                    .filter(p => p.paidDate)
                    .sort((a,b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime())[0]?.paidDate,
                paymentCount: currentInstallment.payments.length,
            };

// Darfak tab (house build expenses)
function DarfakView() {
    const { darfak } = useAccountantStore();
    const { saveDarfak, deleteDarfak } = useAccountantStore.getState();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<DarfakExpense | null>(null);
    const [search, setSearch] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    const allTags = useMemo(() => {
        const s = new Set<string>();
        darfak.forEach(e => (e.tags || []).forEach(t => s.add(t)));
        return Array.from(s).sort();
    }, [darfak]);

    const filtered = useMemo(() => {
        let list = [...darfak];
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(e => e.title.toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q));
        }
        if (tags.length > 0) list = list.filter(e => tags.every(t => e.tags?.includes(t)));
        return list;
    }, [darfak, search, tags]);

    const total = useMemo(() => filtered.reduce((s, e) => s + (e.amount || 0), 0), [filtered]);

    const openNew = () => { setEditing(null); setModalOpen(true); };
    const openEdit = (e: DarfakExpense) => { setEditing(e); setModalOpen(true); };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-3">
                <div className="relative md:w-1/2">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><SearchIcon /></span>
                    <input type="search" placeholder="جستجو هزینه..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800/60 text-white rounded-md py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition placeholder-slate-500" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {["#مصالح", "#دستمزد", ...allTags.filter(t => t !== '#مصالح' && t !== '#دستمزد')].map(tag => (
                        <button key={tag} onClick={() => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={`px-3 py-1 rounded-full text-xs border ${tags.includes(tag) ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>{tag}</button>
                    ))}
                    {tags.length > 0 && <button onClick={() => setTags([])} className="text-slate-400 text-sm">پاک کردن فیلتر</button>}
                    <button onClick={openNew} className="ml-auto bg-sky-600 hover:bg-sky-500 text-white rounded-md px-3 py-2 text-sm flex items-center gap-1"><PlusIcon />افزودن</button>
                </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
                <h3 className="text-slate-300 text-sm mb-1">مجموع هزینه‌های فیلتر شده</h3>
                <p className="text-2xl font-extrabold text-sky-400">{total.toLocaleString('fa-IR')} تومان</p>
            </div>

            <div className="space-y-3">
                {filtered.map(e => (
                    <div key={e.id} className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50">
                        <div className="min-w-0">
                            <p className="font-bold text-slate-100 truncate">{e.title}</p>
                            <p className="text-sm text-slate-400 truncate">{moment(e.date).locale('fa').format('jD jMMMM jYYYY')} • {(e.tags||[]).join(' ')}</p>
                            {e.note && <p className="text-slate-300 text-sm mt-1">{e.note}</p>}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sky-300 text-lg">{e.amount.toLocaleString('fa-IR')} تومان</p>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-sky-400 text-sm">ویرایش</button>
                                <button onClick={() => deleteDarfak(e.id)} className="text-rose-400 hover:text-rose-300 text-sm">حذف</button>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-400 bg-slate-800/20 rounded-lg">هیچ هزینه‌ای یافت نشد.</div>
                )}
            </div>

            <DarfakModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={(payload) => { saveDarfak(payload); setModalOpen(false); }} expense={editing} />
        </div>
    );
}

const DarfakModal = ({ isOpen, onClose, onSave, expense }: { isOpen: boolean; onClose: () => void; onSave: (e: DarfakExpense) => void; expense: DarfakExpense | null; }) => {
    const [form, setForm] = useState<DarfakExpense>(() => expense || ({ id: Date.now().toString(), title: '', amount: 0, date: new Date().toISOString(), tags: ['#مصالح'] } as DarfakExpense));

    React.useEffect(() => {
        if (expense) setForm(expense);
        else setForm({ id: Date.now().toString(), title: '', amount: 0, date: new Date().toISOString(), tags: ['#مصالح'] } as DarfakExpense);
    }, [expense, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...form, amount: parseFloat(String(form.amount)) || 0 });
    };

    const handleTagInput = (raw: string) => {
        const parts = raw.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
        const normalized = parts.map(t => t.startsWith('#') ? t : `#${t}`);
        setForm(p => ({ ...p, tags: Array.from(new Set(normalized)) }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                        <h3 className="text-xl font-bold text-slate-100">{expense ? 'ویرایش هزینه درفک' : 'افزودن هزینه درفک'}</h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">بستن</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <FormInput label="عنوان" id="title" value={form.title} onChange={e => setForm(p => ({...p, title: (e.target as HTMLInputElement).value}))} required />
                        <div className="grid grid-cols-2 gap-3">
                            <FormInput label="مبلغ (تومان)" id="amount" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: Number((e.target as HTMLInputElement).value)}))} required />
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">تاریخ</label>
                                <input type="date" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                                    value={moment(form.date).format('YYYY-MM-DD')}
                                    onChange={e => setForm(p => ({...p, date: moment((e.target as HTMLInputElement).value, 'YYYY-MM-DD').toISOString()}))} required/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">تگ‌ها</label>
                            <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none"
                                value={(form.tags || []).join(' ')} onChange={e => handleTagInput((e.target as HTMLInputElement).value)} placeholder="#مصالح #دستمزد" />
                        </div>
                        <FormTextarea label="یادداشت" id="note" value={form.note} onChange={e => setForm(p => ({...p, note: (e.target as HTMLTextAreaElement).value}))} />
                    </div>
                    <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                        <button type="submit" className="py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm transition">ذخیره</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
            
            return (
                <div>
                     <div className="flex justify-between items-center mb-6 p-4 bg-slate-800 rounded-lg">
                         <button onClick={() => setCurrentInstallment(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                            <ArrowRightIcon />
                            <span>بازگشت به لیست اقساط</span>
                        </button>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-white">{currentInstallment.title}</h3>
                            <p className="text-emerald-400 font-semibold">این طرح تکمیل شده است</p>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900/50 rounded-lg ring-1 ring-slate-700">
                        <h4 className="text-lg font-semibold mb-4 text-slate-200">خلاصه طرح</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مبلغ کل وام:</span><span className="text-slate-100 font-medium">{formatCurrency(stats.loanAmount)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">تعداد اقساط:</span><span className="text-slate-100 font-medium">{stats.paymentCount}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مجموع پرداختی (اصل):</span><span className="text-slate-100 font-medium">{formatCurrency(stats.totalPaidPrincipal)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مجموع سود:</span><span className="text-slate-100 font-medium">{formatCurrency(stats.totalInterest > 0 ? stats.totalInterest : 0)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">مجموع جرائم:</span><span className="text-rose-400 font-medium">{formatCurrency(stats.totalPenalty)}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2"><span className="text-slate-400">تاریخ شروع:</span><span className="text-slate-100 font-medium">{stats.startDate ? formatDate(stats.startDate) : 'N/A'}</span></div>
                            <div className="flex justify-between border-b border-slate-800 py-2 sm:col-span-2"><span className="text-slate-400">تاریخ تسویه کامل:</span><span className="text-slate-100 font-medium">{stats.endDate ? formatDate(stats.endDate) : 'N/A'}</span></div>
                        </div>
                    </div>

                    <div className="text-center my-6">
                        <button onClick={() => setShowPaymentsList(s => !s)} className="py-2 px-5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-md text-sm transition duration-300">
                            {showPaymentsList ? 'پنهان کردن ریز پرداخت‌ها' : 'نمایش ریز پرداخت‌ها'}
                        </button>
                    </div>
                    
                    {showPaymentsList && (
                        <div className="space-y-3 animate-fade-in">
                            {currentInstallment.payments.map((payment, index) => (
                                 <div key={payment.id} className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 opacity-80">
                                    <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                        <CheckCircleIcon />
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-100 truncate">قسط شماره {index + 1}</p>
                                            <p className="text-sm text-slate-400 truncate">تاریخ پرداخت: {payment.paidDate ? formatDate(payment.paidDate) : formatDate(payment.dueDate)}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm sm:text-base text-slate-300">{formatCurrency(payment.amount)}</p>
                                        {payment.penalty > 0 && <p className="text-xs text-rose-500">+ {formatCurrency(payment.penalty)} جریمه</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
    }


    const activePlans = installments.filter(plan => plan.payments.some(p => !p.isPaid));
    const completedPlans = installments.filter(plan => plan.payments.length > 0 && plan.payments.every(p => p.isPaid));

    if (installments.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز برنامه قسطی ثبت نشده است.</p>;
    }
    
    const PlanCard: React.FC<{ plan: any; isCompleted?: boolean }> = ({ plan, isCompleted = false }) => {
        const paidCount = plan.payments.filter(p => p.isPaid).length;
        const totalCount = plan.payments.length;
        const remainingAmount = plan.payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
        const nextPayment = plan.payments.find(p => !p.isPaid);
        const lastPaymentDate = isCompleted ? plan.payments.map(p => p.paidDate).filter(Boolean).sort((a,b) => new Date(b).getTime() - new Date(a).getTime())[0] : null;

        return (
            <div
                className={`bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 transition-all flex flex-col cursor-pointer ${isCompleted ? 'hover:ring-emerald-800' : 'hover:ring-sky-400 hover:-translate-y-1'}`}
                onClick={() => setCurrentInstallment(plan)}
            >
                <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-slate-100 text-lg truncate" title={plan.title}>{plan.title}</h4>
                     <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                       <button onClick={(e) => { e.stopPropagation(); onEditPlan(plan);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                       <button onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
                
                {isCompleted ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center my-4">
                        <CheckCircleIcon className="h-10 w-10 text-emerald-400 mb-2" />
                        <p className="font-bold text-emerald-400">تکمیل شده</p>
                        {lastPaymentDate && <p className="text-xs text-slate-500 mt-1">در تاریخ {formatDate(lastPaymentDate)}</p>}
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <p className="text-2xl font-bold text-sky-400 mb-1">{formatCurrency(remainingAmount)}</p>
                            <p className="text-sm text-slate-400">مانده</p>
                        </div>
                        <div className="mt-auto pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                           <div className="flex justify-between items-center mb-1">
                               <span>پیشرفت</span>
                               <span>{paidCount} / {totalCount}</span>
                           </div>
                           <div className="w-full bg-slate-700 rounded-full h-1.5">
                               <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${totalCount > 0 ? (paidCount/totalCount)*100 : 0}%`}}></div>
                           </div>
                           {nextPayment && <p className="mt-2 text-center">پرداخت بعدی: {formatDate(nextPayment.dueDate)}</p>}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-12">
            <div>
                <h3 className="text-2xl font-bold mb-4 text-slate-200">اقساط فعال</h3>
                {activePlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activePlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
                    </div>
                ) : (
                    <div className="text-center py-10 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                        <CheckCircleIcon className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-200">شما هیچ قسط فعالی ندارید!</h3>
                        <p className="text-slate-400 mt-2">تمام اقساط شما پرداخت شده‌اند یا قسطی ثبت نکرده‌اید.</p>
                    </div>
                )}
            </div>
            
            {completedPlans.length > 0 && (
                 <div>
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-slate-900 px-3 text-lg font-medium text-slate-400">
                                تاریخچه
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {completedPlans
                            .sort((a, b) => {
                                const dateA = a.payments.map(p => p.paidDate).filter(Boolean).sort((d1, d2) => new Date(d2).getTime() - new Date(d1).getTime())[0];
                                const dateB = b.payments.map(p => p.paidDate).filter(Boolean).sort((d1, d2) => new Date(d2).getTime() - new Date(d1).getTime())[0];
                                if (!dateA) return 1;
                                if (!dateB) return -1;
                                return new Date(dateB).getTime() - new Date(dateA).getTime();
                            })
                            .map(plan => <PlanCard key={plan.id} plan={plan} isCompleted={true} />)
                        }
                    </div>
                </div>
            )}
        </div>
    );
}