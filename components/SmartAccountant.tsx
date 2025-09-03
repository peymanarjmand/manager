import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { AccountantData, Transaction, Asset, Person, LedgerEntry, InstallmentPlan, InstallmentPayment } from '../types';
import { TRANSACTION_CATEGORIES, SummaryIcon, TransactionsIcon, AssetsIcon, PeopleIcon, InstallmentsIcon } from '../constants';

// ICONS
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const DefaultImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UserCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const UncheckedCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;


// CONFIG
const STORAGE_KEY = 'lifeManagerAccountant';
type AccountantTab = 'summary' | 'transactions' | 'assets' | 'people' | 'installments';
type ModalConfig = { isOpen: boolean; type?: 'transaction' | 'asset' | 'person' | 'ledger' | 'installmentPlan' | 'installmentPayment'; payload?: any };

// HELPERS
const formatCurrency = (amount: number) => `${amount.toLocaleString('fa-IR')} تومان`;
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
        if (!payload) {
             const isoNow = new Date().toISOString();
             let defaultData: any = {};
             if(type === 'transaction') defaultData = {date: isoNow, type: 'expense', category: TRANSACTION_CATEGORIES.expense[0]};
             else if(type === 'asset') defaultData = {purchaseDate: isoNow};
             else if(type === 'person') defaultData = {};
             else if(type === 'ledger') defaultData = {date: isoNow, type: 'debt'};
             else if(type === 'installmentPlan') defaultData = {firstPaymentDate: isoNow};
             else if(type === 'installmentPayment' && payload) defaultData = {dueDate: payload.dueDate};
             setFormData(defaultData);
        } else {
             const newPayload = {...payload};
             if ((type === 'transaction' || type === 'ledger' || type === 'installmentPayment') && !moment(newPayload.date || newPayload.dueDate).isValid()) {
                if(type === 'installmentPayment') newPayload.dueDate = new Date().toISOString();
                else newPayload.date = new Date().toISOString();
             }
             if (type === 'asset' && !moment(newPayload.purchaseDate).isValid()) {
                 newPayload.purchaseDate = new Date().toISOString();
             }
             setFormData(newPayload);
        }
        setImagePreview(payload?.receiptImage || payload?.avatar || null)
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
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImagePreview(base64String);
                if(type === 'person') setFormData(prev => ({...prev, avatar: base64String}));
                else setFormData(prev => ({...prev, receiptImage: base64String}));
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
             <JalaliDatePicker label="تاریخ سررسید" id="dueDate" value={formData.dueDate} onChange={(isoDate) => setFormData(p => ({...p, dueDate: isoDate}))} />
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
    const [data, setData] = useState<AccountantData>({ transactions: [], assets: [], people: [], ledger: {}, installments: [] });
    const [modal, setModal] = useState<ModalConfig>({ isOpen: false });
    const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
    const [currentInstallment, setCurrentInstallment] = useState<InstallmentPlan | null>(null);

    useEffect(() => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                if (!parsedData.ledger) parsedData.ledger = {};
                if (!parsedData.installments) parsedData.installments = [];
                setData(parsedData);
            }
        } catch (error) {
            console.error("Failed to load accountant data:", error);
            setData({ transactions: [], assets: [], people: [], ledger: {}, installments: [] }); // Reset to default on error
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch(error) {
            console.error("Failed to save accountant data:", error);
        }
    }, [data]);
    
    const openModal = (type: ModalConfig['type'], payload = null) => setModal({ isOpen: true, type, payload });
    const closeModal = () => setModal({ isOpen: false });

    const handleSave = (itemType: string, itemData: any) => {
        setData(prev => {
            const newData = { ...prev, ledger: { ...prev.ledger }, installments: [...prev.installments] };
            const id = itemData.id || Date.now().toString();

            switch (itemType) {
                case 'transaction':
                    const transactions = newData.transactions.filter(t => t.id !== id);
                    newData.transactions = [...transactions, { ...itemData, id }].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    break;
                case 'asset':
                     const assets = newData.assets.filter(a => a.id !== id);
                    newData.assets = [...assets, { ...itemData, id }];
                    break;
                case 'person':
                     const people = newData.people.filter(p => p.id !== id);
                    newData.people = [...people, { ...itemData, id }];
                    if(!newData.ledger[id]) newData.ledger[id] = [];
                    break;
                case 'ledger':
                    const { personId } = itemData;
                    const personLedger = (newData.ledger[personId] || []).filter(l => l.id !== id);
                    newData.ledger[personId] = [...personLedger, { ...itemData, id }].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    break;
                case 'installmentPlan': {
                    const { title, loanAmount, paymentAmount, installmentsCount, firstPaymentDate, id: planId } = itemData;
                    if (planId) { // Editing existing plan title
                        const planIndex = newData.installments.findIndex(p => p.id === planId);
                        if (planIndex > -1) {
                             newData.installments[planIndex] = {
                                ...newData.installments[planIndex],
                                title: title,
                                loanAmount: parseFloat(loanAmount) || newData.installments[planIndex].loanAmount || 0,
                            };
                        }
                    } else { // Creating new plan
                        const newPlanId = Date.now().toString();
                        const payments: InstallmentPayment[] = Array.from({ length: installmentsCount }, (_, i) => ({
                            id: `${newPlanId}-${i}`,
                            dueDate: moment(firstPaymentDate).add(i, 'jMonth').toISOString(),
                            amount: parseFloat(paymentAmount),
                            isPaid: false,
                        }));
                        const newPlan: InstallmentPlan = { id: newPlanId, title, payments, loanAmount: parseFloat(loanAmount) || 0 };
                        newData.installments.push(newPlan);
                    }
                    break;
                }
                case 'installmentPayment': {
                    const { planId, id: paymentId, amount, dueDate } = itemData;
                    const planIndex = newData.installments.findIndex(p => p.id === planId);
                    if (planIndex > -1) {
                        const paymentIndex = newData.installments[planIndex].payments.findIndex(p => p.id === paymentId);
                        if (paymentIndex > -1) {
                            const newPayments = [...newData.installments[planIndex].payments];
                            newPayments[paymentIndex] = { ...newPayments[paymentIndex], amount: parseFloat(amount), dueDate };
                            newData.installments[planIndex] = {...newData.installments[planIndex], payments: newPayments };
                        }
                    }
                    break;
                }
            }
             // Update currentInstallment state if it's being edited
            if(currentInstallment && itemType === 'installmentPlan' && currentInstallment.id === id) {
                const updatedPlan = newData.installments.find(p => p.id === id);
                if(updatedPlan) setCurrentInstallment(updatedPlan);
            }
             if(currentInstallment && itemType === 'installmentPayment' && currentInstallment.id === itemData.planId) {
                const updatedPlan = newData.installments.find(p => p.id === itemData.planId);
                if(updatedPlan) setCurrentInstallment(updatedPlan);
            }
            return newData;
        });
        closeModal();
    };

    const handleDelete = (itemType: string, id: string, personId?: string) => {
        if (!window.confirm("آیا از حذف این مورد اطمینان دارید؟")) return;
        setData(prev => {
            const newData = { ...prev };
            switch (itemType) {
                case 'transaction':
                    newData.transactions = prev.transactions.filter(t => t.id !== id);
                    break;
                case 'asset':
                    newData.assets = prev.assets.filter(a => a.id !== id);
                    break;
                case 'person':
                    newData.people = prev.people.filter(p => p.id !== id);
                    const newLedger = { ...prev.ledger };
                    delete newLedger[id];
                    newData.ledger = newLedger;
                    break;
                case 'ledger':
                    if (personId) {
                        const personLedger = { ...prev.ledger };
                        personLedger[personId] = prev.ledger[personId].filter(l => l.id !== id);
                        newData.ledger = personLedger;
                    }
                    break;
                case 'installmentPlan':
                    newData.installments = prev.installments.filter(p => p.id !== id);
                    setCurrentInstallment(null); // Go back to list view if deleting the current one
                    break;
            }
            return newData;
        });
    };
    
     const handleSettle = (personId: string, ledgerId: string) => {
        setData(prev => {
            const newLedger = { ...prev.ledger };
            const entryIndex = newLedger[personId].findIndex(e => e.id === ledgerId);
            if(entryIndex > -1) {
                newLedger[personId][entryIndex].isSettled = !newLedger[personId][entryIndex].isSettled;
            }
            return { ...prev, ledger: newLedger };
        })
    }
    
    const handleTogglePaidStatus = (planId: string, paymentId: string) => {
        setData(prev => {
            const newData = {...prev};
            const planIndex = newData.installments.findIndex(p => p.id === planId);
            if (planIndex > -1) {
                const newPayments = [...newData.installments[planIndex].payments];
                const paymentIndex = newPayments.findIndex(p => p.id === paymentId);
                if (paymentIndex > -1) {
                    const isNowPaid = !newPayments[paymentIndex].isPaid;
                    newPayments[paymentIndex].isPaid = isNowPaid;
                    newPayments[paymentIndex].paidDate = isNowPaid ? new Date().toISOString() : undefined;
                    
                    const newPlans = [...newData.installments];
                    newPlans[planIndex] = { ...newPlans[planIndex], payments: newPayments };
                    
                    if(currentInstallment?.id === planId) {
                        setCurrentInstallment(newPlans[planIndex]);
                    }
                    return { ...newData, installments: newPlans };
                }
            }
            return newData;
        })
    }


    const handleAddButtonClick = () => {
        switch (activeTab) {
            case 'summary':
            case 'transactions':
                openModal('transaction');
                break;
            case 'assets':
                openModal('asset');
                break;
            case 'people':
                if (currentPerson) openModal('ledger', { personId: currentPerson.id });
                else openModal('person');
                break;
            case 'installments':
                openModal('installmentPlan');
                break;
        }
    };
    
    useEffect(() => {
       if(activeTab !== 'people') setCurrentPerson(null);
       if(activeTab !== 'installments') setCurrentInstallment(null);
    }, [activeTab]);

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
                 <button onClick={handleAddButtonClick} className="w-full sm:w-auto flex items-center justify-center space-x-2 space-x-reverse bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-5 rounded-lg transition">
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
                            { id: 'installments', title: 'اقساط', icon: <InstallmentsIcon /> },
                            { id: 'assets', title: 'دارایی‌ها', icon: <AssetsIcon /> },
                            { id: 'people', title: 'حساب با دیگران', icon: <PeopleIcon /> },
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
                {activeTab === 'installments' && <InstallmentsView installments={data.installments} currentInstallment={currentInstallment} setCurrentInstallment={setCurrentInstallment} onEditPlan={(plan) => openModal('installmentPlan', plan)} onDeletePlan={(id) => handleDelete('installmentPlan', id)} onEditPayment={(p) => openModal('installmentPayment', p)} onTogglePaidStatus={handleTogglePaidStatus} />}
                {activeTab === 'assets' && <AssetsView assets={data.assets} onEdit={(a) => openModal('asset', a)} onDelete={(id) => handleDelete('asset', id)} />}
                {activeTab === 'people' && <PeopleView data={data} onEditPerson={(p) => openModal('person', p)} onDeletePerson={(id) => handleDelete('person', id)} onEditLedger={(l) => openModal('ledger', l)} onDeleteLedger={(personId, ledgerId) => handleDelete('ledger', ledgerId, personId)} onSettle={handleSettle} currentPerson={currentPerson} setCurrentPerson={setCurrentPerson} />}
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
            .reduce((sum, p) => sum + p.amount, 0);

        const totalAmount = allPaymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);

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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <StatCard title="مجموع طلب شما از دیگران" value={totalDebt} colorClass="text-emerald-400" />
                 <StatCard title="مجموع بدهی شما به دیگران" value={totalCredit} colorClass="text-rose-400" />
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
                    {t.receiptImage && <img src={t.receiptImage} className="h-12 w-12 rounded-md object-cover hidden sm:block"/>}
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
                                    {person.avatar ? <img src={person.avatar} className="w-full h-full object-cover" alt={person.name}/> : <UserCircleIcon />}
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

                <p className="text-slate-400">نرخ سود سالانه (APR):</p>
                <p className="text-sky-400 font-bold text-left">{apr !== null ? `${apr.toFixed(2)} %` : 'N/A'}</p>
            </div>
        </div>
    );
};


const InstallmentsView = ({ installments, currentInstallment, setCurrentInstallment, onEditPlan, onDeletePlan, onEditPayment, onTogglePaidStatus }) => {
    if (currentInstallment) {
        const paidCount = currentInstallment.payments.filter(p => p.isPaid).length;
        const totalCount = currentInstallment.payments.length;
        const remainingAmount = currentInstallment.payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount, 0);

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
                                <p className={`font-bold text-sm sm:text-base ${payment.isPaid ? 'text-slate-500 line-through' : 'text-sky-300'}`}>{formatCurrency(payment.amount)}</p>
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
        )
    }

    if (installments.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز برنامه قسطی ثبت نشده است.</p>;
    }
    
     return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {installments.map(plan => {
                 const paidCount = plan.payments.filter(p => p.isPaid).length;
                 const totalCount = plan.payments.length;
                 const remainingAmount = plan.payments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount, 0);
                 const nextPayment = plan.payments.find(p => !p.isPaid);

                return (
                    <div key={plan.id} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 cursor-pointer transition-all hover:ring-sky-400 hover:-translate-y-1 flex flex-col" onClick={() => setCurrentInstallment(plan)}>
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-slate-100 text-lg">{plan.title}</h4>
                             <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                               <button onClick={(e) => { e.stopPropagation(); onEditPlan(plan);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                               <button onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id);}} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                            </div>
                        </div>
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
                    </div>
                )
            })}
        </div>
    );
}