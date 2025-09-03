import React, { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { Contact, TypedEntry } from './types';
import { parseVCF, generateVCF } from './vcf';
import { BackIcon, PlusIcon, EditIcon, DeleteIcon, CloseIcon, UserCircleIcon, SearchIcon, ImportIcon, ExportIcon, PhoneBookIcon } from '../../components/Icons';
import { usePhoneBookStore } from './store';
import { isImageRef, saveImageDataURL, getObjectURLByRef } from '../../lib/idb-images';

type ModalState = { isOpen: boolean; contact?: Contact | null; mode?: 'view' | 'edit' };

// MODAL COMPONENT
const ContactModal = ({ modalState, onClose, onSave, onDelete, setModalState }) => {
    const { isOpen, contact, mode } = modalState;
    const [formData, setFormData] = useState<Partial<Contact> | null>(null);
    const [avatarURL, setAvatarURL] = useState<string | null>(null);

    useEffect(() => {
        if (contact) {
            setFormData(JSON.parse(JSON.stringify(contact))); // Deep copy
        } else {
             setFormData({ fn: '', tels: [{ type: 'CELL', value: '' }], emails: [{ type: 'HOME', value: '' }], org: '', title: '', note: '' });
        }
    }, [contact, isOpen]);

    useEffect(() => {
        let revoked: string | null = null;
        (async () => {
            if (!formData) return;
            const p = formData.photo;
            if (isImageRef(p)) {
                const url = await getObjectURLByRef(p);
                if (url) {
                    setAvatarURL(url);
                    revoked = url;
                } else {
                    setAvatarURL(null);
                }
            } else {
                setAvatarURL(p || null);
            }
        })();
        return () => {
            if (revoked) URL.revokeObjectURL(revoked);
        };
    }, [formData?.photo]);

    if (!isOpen || !formData) return null;

    const isEditMode = mode === 'edit';

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypedEntryChange = (index: number, field: 'tels' | 'emails', subField: 'type' | 'value', value: string) => {
        const newEntries = [...formData[field]];
        newEntries[index][subField] = value;
        setFormData(prev => ({ ...prev, [field]: newEntries }));
    };

    const addTypedEntry = (field: 'tels' | 'emails') => {
        const newEntry = { type: field === 'tels' ? 'CELL' : 'HOME', value: '' };
        setFormData(prev => ({ ...prev, [field]: [...prev[field], newEntry] }));
    };

    const removeTypedEntry = (index: number, field: 'tels' | 'emails') => {
        const newEntries = [...formData[field]];
        newEntries.splice(index, 1);
        setFormData(prev => ({ ...prev, [field]: newEntries }));
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const dataUrl = reader.result as string;
                    const ref = await saveImageDataURL(dataUrl);
                    setFormData(prev => ({ ...prev, photo: ref }));
                    const url = await getObjectURLByRef(ref);
                    setAvatarURL(url);
                } catch (err) {
                    console.error('Failed to save image to IDB', err);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const title = mode === 'edit' ? (contact?.id ? 'ویرایش مخاطب' : 'افزودن مخاطب') : 'جزئیات مخاطب';

    const renderField = (label, value) => value ? <div className="py-2"><dt className="text-sm font-medium text-slate-400">{label}</dt><dd className="mt-1 text-md text-slate-200">{value}</dd></div> : null;
    const renderTypedField = (label, entries: TypedEntry[]) => entries && entries.length > 0 && entries[0].value ? <div className="py-2"><dt className="text-sm font-medium text-slate-400">{label}</dt><dd className="mt-1 text-md text-slate-200">{entries.map((e,i) => <div key={i}>{e.value} <span className="text-xs text-slate-500">({e.type})</span></div>)}</dd></div> : null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-xl w-full max-w-2xl shadow-2xl ring-1 ring-slate-700 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-xl font-bold text-slate-100">{title}</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition"><CloseIcon /></button>
                </header>
                
                <div className="overflow-y-auto p-6">
                 <form onSubmit={handleSubmit} id="contactForm">
                    <div className={`grid ${isEditMode ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                        {/* Avatar */}
                        <div className="md:col-span-1 flex flex-col items-center">
                            <div className="w-32 h-32 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden mb-4">
                               {avatarURL ? <img src={avatarURL} className="w-full h-full object-cover" alt={formData.fn}/> : <UserCircleIcon />}
                            </div>
                            {isEditMode && <label htmlFor="file-upload" className="cursor-pointer bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-md hover:bg-slate-600 transition text-sm">تغییر تصویر<input id="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*"/></label>}
                        </div>

                        {/* Details */}
                        <div className="md:col-span-2">
                        {isEditMode ? (
                            <div className="space-y-4">
                                <input name="fn" value={formData.fn} onChange={handleChange} placeholder="نام کامل" required className="w-full text-2xl font-bold bg-transparent focus:outline-none text-white border-b border-slate-600 focus:border-sky-400 transition pb-2"/>
                                {formData.tels.map((tel, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <input value={tel.value} onChange={e => handleTypedEntryChange(i, 'tels', 'value', e.target.value)} placeholder="شماره تلفن" className="w-full bg-slate-700/50 rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"/>
                                        <input value={tel.type} onChange={e => handleTypedEntryChange(i, 'tels', 'type', e.target.value.toUpperCase())} placeholder="نوع" className="w-1/3 bg-slate-700/50 rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"/>
                                        <button type="button" onClick={() => removeTypedEntry(i, 'tels')} className="text-rose-400 p-1">&times;</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addTypedEntry('tels')} className="text-sm text-sky-400">+ افزودن شماره</button>
                                
                                {formData.emails.map((email, i) => (
                                     <div key={i} className="flex gap-2 items-center">
                                        <input value={email.value} onChange={e => handleTypedEntryChange(i, 'emails', 'value', e.target.value)} placeholder="ایمیل" className="w-full bg-slate-700/50 rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"/>
                                        <input value={email.type} onChange={e => handleTypedEntryChange(i, 'emails', 'type', e.target.value.toUpperCase())} placeholder="نوع" className="w-1/3 bg-slate-700/50 rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"/>
                                        <button type="button" onClick={() => removeTypedEntry(i, 'emails')} className="text-rose-400 p-1">&times;</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addTypedEntry('emails')} className="text-sm text-sky-400">+ افزودن ایمیل</button>

                                <input name="org" value={formData.org} onChange={handleChange} placeholder="شرکت/سازمان" className="w-full bg-slate-700/50 rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"/>
                                <input name="title" value={formData.title} onChange={handleChange} placeholder="عنوان شغلی" className="w-full bg-slate-700/50 rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"/>
                                <textarea name="note" value={formData.note} onChange={handleChange} placeholder="یادداشت" rows={3} className="w-full bg-slate-700/50 rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"/>
                            </div>
                        ) : (
                            <dl>
                                <h3 className="text-2xl font-bold text-white pb-2 border-b border-slate-700">{formData.fn}</h3>
                                {renderTypedField('شماره تلفن', formData.tels)}
                                {renderTypedField('ایمیل', formData.emails)}
                                {renderField('شرکت/سازمان', formData.org)}
                                {renderField('عنوان شغلی', formData.title)}
                                {formData.note && <div className="py-2"><dt className="text-sm font-medium text-slate-400">یادداشت</dt><dd className="mt-1 text-md text-slate-200 whitespace-pre-wrap">{formData.note}</dd></div>}
                            </dl>
                        )}
                        </div>
                    </div>
                  </form>
                </div>

                <footer className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-between items-center shrink-0">
                    {isEditMode ? (
                        <button type="submit" form="contactForm" className="py-2 px-5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm transition duration-300">ذخیره</button>
                    ) : (
                        <button type="button" onClick={() => onDelete(contact.id)} className="py-2 px-4 flex items-center text-rose-400 hover:text-rose-300 font-bold text-sm transition">
                            <DeleteIcon/> <span className="mr-1">حذف</span>
                        </button>
                    )}

                    <div className="flex items-center gap-3">
                         {!isEditMode && <button type="button" onClick={() => setModalState(prev => ({...prev, mode: 'edit'}))} className="py-2 px-4 flex items-center bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-md text-sm transition"> <EditIcon/> <span className="mr-2">ویرایش</span></button>}
                         <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">بستن</button>
                    </div>
                </footer>
            </div>
        </div>
    );
};


// MAIN COMPONENT
export const PhoneBook = ({ onNavigateBack }: { onNavigateBack: () => void; }): React.ReactNode => {
    const [searchTerm, setSearchTerm] = useState('');
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const contacts = usePhoneBookStore((state) => state.contacts);
    const { saveContact, deleteContact, importContacts } = usePhoneBookStore.getState();

    const openModal = (contact: Contact | null = null, mode: 'view' | 'edit' = 'view') => {
        setModalState({ isOpen: true, contact, mode: contact ? mode : 'edit' });
    };
    const closeModal = () => setModalState({ isOpen: false });

    const handleSave = (formData: Partial<Contact>) => {
        const contactToSave: Contact = {
            ...formData,
            id: formData.id || `${Date.now()}`,
            fn: formData.fn || "بدون نام",
            tels: (formData.tels || []).filter(t => t.value),
            emails: (formData.emails || []).filter(e => e.value),
        } as Contact;
        saveContact(contactToSave);
        closeModal();
    };

    const handleDelete = (id: string) => {
        if(window.confirm('آیا از حذف این مخاطب اطمینان دارید؟')) {
            deleteContact(id);
            closeModal();
        }
    };

    const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result as string;
                const newContacts = parseVCF(content);
                importContacts(newContacts);
            };
            reader.readAsText(file as Blob);
        });
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleExport = () => {
        const vcfData = generateVCF(contacts);
        const blob = new Blob([vcfData], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contacts.vcf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const filteredContacts = useMemo(() => {
        return contacts
            .filter(contact => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                return (
                    contact.fn?.toLowerCase().includes(lowerSearch) ||
                    contact.tels?.some(t => t.value.includes(lowerSearch)) ||
                    contact.emails?.some(e => e.value.toLowerCase().includes(lowerSearch)) ||
                    contact.org?.toLowerCase().includes(lowerSearch)
                );
            })
            .sort((a, b) => (a.fn || '').localeCompare(b.fn || '', 'fa'));
    }, [contacts, searchTerm]);
    
    const groupedContacts = useMemo(() => {
        return filteredContacts.reduce((groups, contact) => {
            const letter = contact.fn?.[0]?.toUpperCase() || '#';
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(contact);
            return groups;
        }, {} as Record<string, Contact[]>);
    }, [filteredContacts]);

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <ContactModal modalState={modalState} onClose={closeModal} onSave={handleSave} onDelete={handleDelete} setModalState={setModalState} />
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".vcf,text/vcard" multiple className="hidden"/>

            <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                     <button onClick={onNavigateBack} className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg transition" title="بازگشت به داشبورد">
                        <BackIcon />
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">دفتر تلفن</h2>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={() => fileInputRef.current?.click()} className="flex items-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition text-sm"><ImportIcon/> وارد کردن</button>
                     <button onClick={handleExport} disabled={contacts.length === 0} className="flex items-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"><ExportIcon/> خروجی</button>
                     <button onClick={() => openModal(null, 'edit')} className="flex items-center bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg transition text-sm"><PlusIcon/> افزودن</button>
                </div>
            </header>
            
            <div className="mb-6 relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><SearchIcon /></span>
                <input type="search" placeholder="جستجوی مخاطب..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/60 text-white rounded-md py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition placeholder-slate-500" />
            </div>

            {filteredContacts.length > 0 ? (
                <div className="space-y-8">
                    {Object.keys(groupedContacts).sort((a,b) => a.localeCompare(b, 'fa')) .map(letter => (
                        <div key={letter}>
                            <h3 className="text-2xl font-bold text-sky-400 border-b-2 border-slate-700 pb-2 mb-4">{letter}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {groupedContacts[letter].map(contact => (
                                    <div key={contact.id} onClick={() => openModal(contact, 'view')} className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 flex items-center space-x-4 space-x-reverse cursor-pointer transition-all hover:ring-sky-400 hover:-translate-y-1">
                                        <div className="w-14 h-14 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            <AvatarImage photo={contact.photo} alt={contact.fn} fallbackLetter={contact.fn?.[0]?.toUpperCase()} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-100 truncate">{contact.fn}</p>
                                            <p className="text-sm text-slate-400 truncate">{contact.tels?.[0]?.value || ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                    <div className="text-5xl text-slate-600 mb-4"><PhoneBookIcon className="h-16 w-16 text-slate-600" /></div>
                    <h3 className="text-xl font-semibold text-slate-200">{searchTerm ? 'مخاطبی یافت نشد' : 'دفتر تلفن شما خالی است'}</h3>
                    <p className="text-slate-400 mt-2">{searchTerm ? 'عبارت جستجو را تغییر دهید.' : 'برای شروع، یک مخاطب اضافه کنید یا از فایل vCard وارد کنید.'}</p>
                </div>
            )}
        </div>
    );
};

const AvatarImage = ({ photo, alt, fallbackLetter }: { photo?: string; alt: string; fallbackLetter?: string }) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        let toRevoke: string | null = null;
        (async () => {
            if (isImageRef(photo)) {
                const _url = await getObjectURLByRef(photo);
                if (!active) return;
                setUrl(_url);
                toRevoke = _url;
            } else {
                setUrl(photo || null);
            }
        })();
        return () => {
            active = false;
            if (toRevoke) URL.revokeObjectURL(toRevoke);
        };
    }, [photo]);

    if (url) return <img src={url} className="w-full h-full object-cover" alt={alt} />;
    return <span className="text-2xl font-bold text-slate-400">{fallbackLetter}</span>;
};