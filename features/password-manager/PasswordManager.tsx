import React, { useState, useMemo, ChangeEvent } from 'react';
import { PASSWORD_CATEGORIES } from './constants';
import { AnyPasswordEntry, PasswordCategory } from './types';
import { BackIcon, PlusIcon, EditIcon, DeleteIcon, EyeIcon, EyeOffIcon, CloseIcon, AlertIcon, DefaultImageIcon } from '../../components/Icons';
import { usePasswordStore } from './store';
import { saveImageDataURL, isImageRef, getObjectURLByRef } from '../../lib/idb-images';

type ModalState = {
    isOpen: boolean;
    entry: AnyPasswordEntry | null;
}

// Reusable Input Component
const FormInput = ({ label, id, value, onChange, type = 'text', required = false, isSecret = false }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <div className="relative">
                <input
                    type={isSecret ? (isRevealed ? 'text' : 'password') : type}
                    id={id}
                    name={id}
                    value={value || ''}
                    onChange={onChange}
                    required={required}
                    className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                />
                {isSecret && (
                    <button type="button" onClick={() => setIsRevealed(!isRevealed)} className="absolute inset-y-0 left-0 flex items-center px-3 text-slate-400 hover:text-sky-400" aria-label={isRevealed ? "پنهان کردن" : "نمایش"}>
                        {isRevealed ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                )}
            </div>
        </div>
    );
};

// Form Modal Component
const ItemFormModal = ({ isOpen, onClose, onSave, entry, category }) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState(entry || {});
    const [imagePreview, setImagePreview] = useState(entry?.image || null);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                // Save to IndexedDB and store just a reference
                const ref = await saveImageDataURL(base64String);
                setImagePreview(base64String);
                setFormData(prev => ({...prev, image: ref}));
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const getTitle = (entry, category) => {
        if(entry) return "ویرایش مورد";
        const catInfo = PASSWORD_CATEGORIES.find(c => c.id === category);
        return `افزودن به ${catInfo?.title || 'لیست'}`;
    }

    const renderFields = () => {
        switch (category) {
            case 'emails': return <>
                <FormInput label="آدرس ایمیل" id="email" value={formData.email} onChange={handleChange} required />
                <FormInput label="رمز عبور" id="password" value={formData.password} onChange={handleChange} isSecret />
                <FormInput label="شماره تلفن متصل" id="phone" value={formData.phone} onChange={handleChange} />
                <FormInput label="ایمیل پشتیبان" id="backupEmail" value={formData.backupEmail} onChange={handleChange} />
            </>;
            case 'banks': return <>
                <FormInput label="نام بانک" id="bankName" value={formData.bankName} onChange={handleChange} required/>
                <FormInput label="شماره کارت" id="cardNumber" value={formData.cardNumber} onChange={handleChange} />
                <FormInput label="رمز کارت" id="cardPin" value={formData.cardPin} onChange={handleChange} isSecret/>
                <FormInput label="نام کاربری همراه بانک" id="mobileBankUser" value={formData.mobileBankUser} onChange={handleChange} />
                <FormInput label="رمز عبور همراه بانک" id="mobileBankPass" value={formData.mobileBankPass} onChange={handleChange} isSecret/>
            </>;
            case 'accounts': return <>
                <FormInput label="نام وب‌سایت/اپلیکیشن" id="website" value={formData.website} onChange={handleChange} required/>
                <FormInput label="نام کاربری" id="username" value={formData.username} onChange={handleChange} />
                <FormInput label="رمز عبور" id="password" value={formData.password} onChange={handleChange} isSecret/>
            </>;
            case 'wallets': return <>
                <FormInput label="نام کیف پول" id="walletName" value={formData.walletName} onChange={handleChange} required/>
                <FormInput label="آدرس کیف پول" id="address" value={formData.address} onChange={handleChange} />
                <div className="bg-amber-500/10 p-3 rounded-md flex items-start ring-1 ring-amber-500/30 text-amber-300 text-xs">
                    <AlertIcon className="h-5 w-5 text-amber-400 shrink-0 mr-2"/>
                    <p>هشدار: ذخیره عبارت بازیابی (Seed Phrase) ریسک امنیتی بالایی دارد. با احتیاط کامل عمل کنید.</p>
                </div>
                <div>
                  <label htmlFor="seedPhrase" className="block text-sm font-medium text-slate-300 mb-1">عبارت بازیابی</label>
                  <textarea id="seedPhrase" name="seedPhrase" value={formData.seedPhrase || ''} onChange={handleChange} rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition font-mono" />
                </div>
            </>;
            case 'exchanges': return <>
                <FormInput label="نام صرافی" id="exchangeName" value={formData.exchangeName} onChange={handleChange} required/>
                <FormInput label="نام کاربری" id="username" value={formData.username} onChange={handleChange} />
                <FormInput label="رمز عبور" id="password" value={formData.password} onChange={handleChange} isSecret/>
                <FormInput label="ایمیل متصل" id="email" value={formData.email} onChange={handleChange} />
                <FormInput label="شماره تلفن متصل" id="phone" value={formData.phone} onChange={handleChange} />
                <div className="flex items-center">
                    <input type="checkbox" id="twoFA" name="twoFA" checked={!!formData.twoFA} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
                    <label htmlFor="twoFA" className="mr-2 block text-sm text-slate-300">تایید دو مرحله‌ای فعال است</label>
                </div>
            </>;
            default: return null;
        }
    };
    
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleSubmit}>
                  <div className="flex justify-between items-center p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                      <h3 className="text-xl font-bold text-slate-100">{getTitle(entry, category)}</h3>
                      <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                          <CloseIcon />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      {renderFields()}
                      <div>
                          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">توضیحات</label>
                          <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">تصویر</label>
                          <div className="mt-1 flex items-center space-x-4 space-x-reverse">
                              <span className="h-20 w-20 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                                  {imagePreview ? <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" /> : <DefaultImageIcon />}
                              </span>
                              <label htmlFor="file-upload" className="cursor-pointer bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-md hover:bg-slate-600 transition">
                                  <span>بارگذاری تصویر</span>
                                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*"/>
                              </label>
                          </div>
                      </div>
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


// Item Card Component
const ItemCard = ({ entry, onEdit, onDelete }) => {
    const [isRevealed, setIsRevealed] = useState(false);
    const [objectURL, setObjectURL] = useState<string | null>(null);

    React.useEffect(() => {
        let revoked: string | null = null;
        (async () => {
            if (entry.image && isImageRef(entry.image)) {
                const url = await getObjectURLByRef(entry.image);
                if (url) {
                    setObjectURL(url);
                    revoked = url;
                }
            }
        })();
        return () => {
            if (revoked) URL.revokeObjectURL(revoked);
        };
    }, [entry.image]);

    const getTitle = () => {
        switch (entry.category) {
            case 'emails': return entry.email;
            case 'banks': return entry.bankName;
            case 'accounts': return entry.website;
            case 'wallets': return entry.walletName;
            case 'exchanges': return entry.exchangeName;
        }
    };
    
    const getSecretField = () => {
        const secret = entry.password || entry.cardPin || entry.mobileBankPass || '••••••••';
        return isRevealed ? secret : '••••••••';
    }

    const hasSecret = entry.password || entry.cardPin || entry.mobileBankPass;

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 flex flex-col space-y-3 transition-shadow hover:shadow-lg hover:shadow-slate-900/50">
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="w-12 h-12 bg-slate-700 rounded-lg flex-shrink-0 flex items-center justify-center">
                        {entry.image ? <img src={objectURL || (isImageRef(entry.image) ? '' : entry.image)} className="w-full h-full object-cover rounded-lg" alt={getTitle()}/> : <span className="text-slate-500">{PASSWORD_CATEGORIES.find(c => c.id === entry.category).icon}</span>}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-100 truncate" title={getTitle()}>{getTitle()}</h4>
                        {entry.username && <p className="text-sm text-slate-400">{entry.username}</p>}
                        {entry.mobileBankUser && <p className="text-sm text-slate-400">{entry.mobileBankUser}</p>}
                    </div>
                </div>
                <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                   <button onClick={() => onEdit(entry)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                   <button onClick={() => onDelete(entry.id)} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                </div>
            </div>
            {hasSecret && (
                <div className="flex items-center justify-between bg-slate-900/50 rounded-md px-3 py-1.5">
                    <span className="text-sm text-slate-300 font-mono tracking-wider">{getSecretField()}</span>
                    <button onClick={() => setIsRevealed(!isRevealed)} className="text-slate-400 hover:text-sky-400 transition" aria-label={isRevealed ? "پنهان کردن رمز" : "نمایش رمز"}>
                        {isRevealed ? <EyeOffIcon/> : <EyeIcon/>}
                    </button>
                </div>
            )}
             {entry.description && <p className="text-sm text-slate-400 pt-1 border-t border-slate-700/50">{entry.description}</p>}
        </div>
    );
}

// Main Component
export const PasswordManager = ({ onNavigateBack }: { onNavigateBack: () => void; }): React.ReactNode => {
    const [activeCategory, setActiveCategory] = useState<PasswordCategory>('emails');
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, entry: null });
    const [searchTerm, setSearchTerm] = useState('');

    const entries = usePasswordStore((state) => state.entries);
    const { saveEntry, deleteEntry } = usePasswordStore.getState();

    const handleSave = (formDataFromModal: Omit<AnyPasswordEntry, 'id' | 'category'> & { id?: string }) => {
        const entryToSave: AnyPasswordEntry = {
            ...formDataFromModal,
            id: formDataFromModal.id || Date.now().toString(),
            category: activeCategory,
        } as AnyPasswordEntry;
        saveEntry(activeCategory, entryToSave);
        closeModal();
    };

    const handleDelete = (id: string) => {
        if(window.confirm('آیا از حذف این مورد اطمینان دارید؟ این عمل قابل بازگشت نیست.')) {
            deleteEntry(activeCategory, id);
        }
    };
    
    const openModal = (entry: AnyPasswordEntry | null = null) => setModalState({ isOpen: true, entry });
    const closeModal = () => setModalState({ isOpen: false, entry: null });

    const filteredEntries = useMemo(() => {
        if (!searchTerm) {
            return entries[activeCategory];
        }
        return entries[activeCategory].filter(entry => {
            const values = Object.values(entry).join(' ').toLowerCase();
            return values.includes(searchTerm.toLowerCase());
        })
    }, [entries, activeCategory, searchTerm]);

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <ItemFormModal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onSave={handleSave}
                entry={modalState.entry}
                category={activeCategory}
            />
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                     <button onClick={onNavigateBack} className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg transition" title="بازگشت به داشبورد">
                        <BackIcon />
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">مدیر رمز عبور</h2>
                </div>
                <button onClick={() => openModal()} className="w-full sm:w-auto flex items-center justify-center space-x-2 space-x-reverse bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-5 rounded-lg transition">
                    <PlusIcon />
                    <span>افزودن</span>
                </button>
            </div>
            
            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex space-x-4 space-x-reverse overflow-x-auto" aria-label="Tabs">
                        {PASSWORD_CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }}
                                className={`${activeCategory === cat.id ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}
                                whitespace-nowrap flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                                aria-current={activeCategory === cat.id ? 'page' : undefined}>
                                <span className="ml-2">{cat.icon}</span>
                                {cat.title}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div>
                 <div className="mb-6">
                    <input type="search" placeholder={`جستجو در ${PASSWORD_CATEGORIES.find(c => c.id === activeCategory).title}...`}
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/60 text-white rounded-md py-2.5 px-4 focus:ring-2 focus:ring-sky-400 focus:outline-none transition placeholder-slate-500" />
                 </div>
                {filteredEntries.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                       {filteredEntries.map((entry: AnyPasswordEntry) => (
                           <ItemCard entry={entry} onEdit={openModal} onDelete={handleDelete}/>
                       ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                        <div className="text-5xl text-slate-600 mb-4">{PASSWORD_CATEGORIES.find(c => c.id === activeCategory).icon}</div>
                        <h3 className="text-xl font-semibold text-slate-200">هنوز موردی اضافه نشده است</h3>
                        <p className="text-slate-400 mt-2">برای شروع، روی دکمه "افزودن" کلیک کنید.</p>
                    </div>
                )}
            </div>
        </div>
    );
};