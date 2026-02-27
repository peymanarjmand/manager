import React, { ChangeEvent, useEffect, useState } from 'react';
import moment from 'jalali-moment';
import { TRANSACTION_CATEGORIES } from './constants';
import { PlusIcon, CloseIcon } from '../../components/Icons';
import { useAccountantStore } from './store';
import { isImageRef, saveImageDataURL, getObjectURLByRef } from '../../lib/idb-images';
import { LEDGER_UNITS, getLedgerUnitConfig, FormInput, FormSelect, FormTextarea, FormImageUpload, JalaliDatePicker } from './SmartAccountantShared';

export const AccountantFormModal = ({ isOpen, onClose, onSave, type, payload }: {isOpen: boolean, onClose: () => void, onSave: (type:string, data:any)=>void, type?:string, payload?:any}) => {
    const { customCategories, addCustomCategory } = useAccountantStore();
    const [formData, setFormData] = useState(payload || {});
    const [imagePreview, setImagePreview] = useState(payload?.receiptImage || payload?.avatar || null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

    useEffect(() => {
        setIsCustomCategoryMode(false);
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
                case 'person': defaultData = {}; break;
                case 'ledger': defaultData = {date: isoNow, type: 'debt'}; break;
                case 'installmentPlan': defaultData = {firstPaymentDate: isoNow}; break;
                case 'check': defaultData = {dueDate: isoNow, type: 'issued', status: 'pending'}; break;
             }
             setFormData(defaultData);
        }
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

    if (!isOpen) return null;

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'type' && (type === 'transaction')) {
                const newType = value as 'income' | 'expense';
                const defaults = TRANSACTION_CATEGORIES[newType] || [];
                newState.category = defaults[0];
            }
            return newState;
        });
    };
    
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            setIsUploading(true);
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
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (type === 'transaction') {
            const cat = formData.category;
            const tType = formData.type as 'income' | 'expense';
            if (cat && !TRANSACTION_CATEGORIES[tType].includes(cat)) {
                addCustomCategory(tType, cat);
            }
        }
        onSave(type, formData);
    };

    const getTitle = () => {
        const action = payload?.id ? "ویرایش" : "افزودن";
        switch (type) {
            case 'transaction': return `${action} تراکنش`;
            case 'person': return `${action} شخص`;
            case 'ledger': return `${action} حساب`;
            case 'installmentPlan': return `${action} قسط`;
            case 'installmentPayment': return `ویرایش پرداخت قسط`;
            case 'check': return `${action} چک`;
            default: return "فرم";
        }
    }
    
    const renderTransactionFields = () => {
        const tType = (formData.type || 'expense') as 'income' | 'expense';
        const defaultCats = TRANSACTION_CATEGORIES[tType] || [];
        const customCats = customCategories[tType] || [];
        const allCats = [...defaultCats, ...customCats];
        const uniqueCats = Array.from(new Set(allCats));

        return (
            <>
                <FormSelect label="نوع" id="type" value={formData.type} onChange={handleChange} required>
                    <option value="expense">هزینه</option>
                    <option value="income">درآمد</option>
                </FormSelect>

                 <div className="relative">
                     {!isCustomCategoryMode ? (
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <FormSelect label="دسته بندی" id="category" value={formData.category} onChange={handleChange} required>
                                    {uniqueCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </FormSelect>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => { setIsCustomCategoryMode(true); setFormData(p => ({...p, category: ''})); }}
                                className="mb-[1px] p-2.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 hover:text-white transition"
                                title="افزودن دسته‌بندی جدید"
                            >
                                <PlusIcon />
                            </button>
                        </div>
                     ) : (
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <FormInput 
                                    label="دسته بندی جدید" 
                                    id="category" 
                                    value={formData.category} 
                                    onChange={handleChange} 
                                    placeholder="نام دسته بندی..." 
                                    required 
                                    autoFocus
                                />
                            </div>
                             <button 
                                type="button" 
                                onClick={() => { setIsCustomCategoryMode(false); setFormData(p => ({...p, category: uniqueCats[0]})); }}
                                className="mb-[1px] p-2.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 hover:text-white transition"
                                title="بازگشت به لیست"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                     )}
                </div>

                <FormInput label="مبلغ" id="amount" type="number" value={formData.amount} onChange={handleChange} required />
                <FormInput label="توضیحات" id="description" value={formData.description} onChange={handleChange} required />
                <JalaliDatePicker label="تاریخ" id="date" value={formData.date} onChange={(isoDate) => setFormData(p => ({...p, date: isoDate}))} />
                <FormImageUpload label="رسید" preview={imagePreview} onChange={handleImageChange} />
            </>
        );
    };
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
    const renderLedgerFields = () => {
        const cfg = getLedgerUnitConfig(formData.unit || 'toman');
        return (
            <>
                <FormSelect label="نوع" id="type" value={formData.type} onChange={handleChange} required>
                    <option value="debt">بهش دادم (او به من بدهکار است)</option>
                    <option value="credit">ازش گرفتم (من به او بدهکارم)</option>
                </FormSelect>
                <FormSelect
                    label="واحد"
                    id="unit"
                    value={formData.unit || 'toman'}
                    onChange={handleChange}
                    required
                >
                    {LEDGER_UNITS.map(u => (
                        <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                </FormSelect>
                <FormInput
                    label={`مقدار (${cfg.label})`}
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const raw = e.target.value;
                        const parts = raw.split('.');
                        if (parts[1] && parts[1].length > cfg.maxDecimals) {
                            const trimmed = `${parts[0]}.${parts[1].slice(0, cfg.maxDecimals)}`;
                            setFormData(p => ({ ...p, amount: trimmed }));
                        } else {
                            setFormData(p => ({ ...p, amount: raw }));
                        }
                    }}
                    step={cfg.step}
                    required
                />
                <FormInput label="توضیحات" id="description" value={formData.description} onChange={handleChange} required />
                <JalaliDatePicker label="تاریخ" id="date" value={formData.date} onChange={(isoDate) => setFormData(p => ({...p, date: isoDate}))} />
                <FormImageUpload label="رسید (اختیاری)" preview={imagePreview} onChange={handleImageChange} />
            </>
        );
    };
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
                      <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                      <button type="submit" disabled={isUploading} className={`py-2 px-4 rounded-md text-sm font-bold transition ${isUploading ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>ذخیره</button>
                  </div>
              </form>
          </div>
      </div>
    );
};
