import React, { useState, useEffect } from 'react';
import { useSettingsStore } from './store';
import { Settings } from '../../types';
import { CloseIcon, AlertIcon } from '../../components/Icons';
import { usePasswordStore } from '../password-manager/store';
import { usePhoneBookStore } from '../phone-book/store';
import { useDailyTasksStore } from '../daily-tasks/store';
import { useAccountantStore } from '../smart-accountant/store';
import { encryptString } from '../../lib/crypto';
import { getMasterKey } from '../../lib/crypto-session';
import { webStorage } from '../../lib/storage';

const FormInput = ({ label, id, value, onChange, type = 'number', min = 1, step = 1, unit }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <div className="relative">
            <input
                type={type}
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                min={min}
                step={step}
                className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
            />
            <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 text-sm">{unit}</span>
        </div>
    </div>
);

const FormToggle = ({ label, id, checked, onChange, description }) => (
    <div className="flex justify-between items-center">
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-200">{label}</label>
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`${checked ? 'bg-sky-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
        >
            <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
        </button>
    </div>
);

export const SettingsModal = ({ isOpen, onClose }) => {
    const storedSettings = useSettingsStore(state => state.settings);
    const updateSettings = useSettingsStore(state => state.updateSettings);
    const [localSettings, setLocalSettings] = useState<Settings>(storedSettings);

    useEffect(() => {
        setLocalSettings(storedSettings);
    }, [isOpen, storedSettings]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        setLocalSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) : value,
        }));
    };
    
    const handleToggle = (name: keyof Settings) => {
        setLocalSettings(prev => ({
            ...prev,
            [name]: !prev[name],
        }));
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings(localSettings);
        onClose();
    };

    // ===== Backup/Export helpers =====
    const buildModulesData = () => {
        const pm = usePasswordStore.getState().entries;
        const pb = usePhoneBookStore.getState().contacts;
        const dt = useDailyTasksStore.getState();
        const sa = useAccountantStore.getState();
        const st = useSettingsStore.getState().settings;
        return {
            passwordManager: { entries: pm },
            phoneBook: { contacts: pb },
            dailyTasks: { tasks: dt.tasks, projects: dt.projects },
            smartAccountant: {
                transactions: sa.transactions,
                assets: sa.assets,
                people: sa.people,
                ledger: sa.ledger,
                installments: sa.installments,
                checks: sa.checks,
            },
            settings: st,
        };
    };

    const downloadText = (text: string, filename: string) => {
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const exportPlain = () => {
        const data = {
            format: 'life-manager-backup',
            version: 1,
            encrypted: false,
            createdAt: new Date().toISOString(),
            modules: buildModulesData(),
        };
        const fname = `life-manager-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        downloadText(JSON.stringify(data, null, 2), fname);
    };

    const exportEncrypted = async () => {
        const key = getMasterKey();
        if (!key) {
            alert('برای گرفتن بکاپ رمزنگاری‌شده، ابتدا باید وارد شده باشید.');
            return;
        }
        const modules = buildModulesData();
        const plaintext = JSON.stringify(modules);
        try {
            const payload = await encryptString(plaintext, key);
            let kdf: { salt?: string; iterations?: number } | undefined = undefined;
            try {
                const paramsRaw = webStorage.getItem('lifeManagerMasterParams');
                if (paramsRaw) {
                    const params = JSON.parse(paramsRaw);
                    kdf = { salt: params.salt, iterations: params.iterations };
                }
            } catch {}
            const wrapper = {
                format: 'life-manager-backup',
                version: 1,
                encrypted: true,
                alg: 'AES-GCM-256',
                kdf,
                createdAt: new Date().toISOString(),
                payload,
            };
            const fname = `life-manager-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.lmbkp.json`;
            downloadText(JSON.stringify(wrapper), fname);
        } catch (e) {
            console.error('Export encryption error', e);
            alert('خطا در رمزنگاری و ساخت بکاپ رخ داد.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-slate-700 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave}>
                    <header className="flex justify-between items-center p-4 border-b border-slate-700">
                        <h3 className="text-xl font-bold text-slate-100">تنظیمات</h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">
                            <CloseIcon />
                        </button>
                    </header>

                    <main className="p-6 space-y-6 overflow-y-auto">
                        <section>
                            <h4 className="font-semibold text-slate-200 mb-3">تنظیمات تایمر پومودورو</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormInput label="زمان تمرکز" id="focusDuration" value={localSettings.focusDuration} onChange={handleChange} unit="دقیقه" />
                                <FormInput label="استراحت کوتاه" id="shortBreakDuration" value={localSettings.shortBreakDuration} onChange={handleChange} unit="دقیقه" />
                                <FormInput label="استراحت طولانی" id="longBreakDuration" value={localSettings.longBreakDuration} onChange={handleChange} unit="دقیقه" />
                                <FormInput label="جلسات در هر دور" id="sessionsPerRound" value={localSettings.sessionsPerRound} onChange={handleChange} unit="جلسه" />
                            </div>
                        </section>
                        
                        <div className="border-t border-slate-700"></div>

                        <section>
                            <h4 className="font-semibold text-slate-200 mb-3">تنظیمات هشدارهای سلامتی</h4>
                            <div className="space-y-4">
                               <FormToggle label="فعال‌سازی هشدار استراحت چشم" id="eyeStrainAlertEnabled" checked={localSettings.eyeStrainAlertEnabled} onChange={() => handleToggle('eyeStrainAlertEnabled')} description="هر ۲۰ دقیقه یکبار یادآوری می‌کند."/>
                               {localSettings.eyeStrainAlertEnabled && (
                                   <div className="pl-4 border-r-2 border-slate-700 space-y-4 animate-fade-in">
                                        <FormToggle label="پخش صدا برای هشدار" id="soundEnabled" checked={localSettings.soundEnabled} onChange={() => handleToggle('soundEnabled')} description="" />
                                        <div>
                                            <label htmlFor="eyeStrainMessage" className="block text-sm font-medium text-slate-300 mb-1">متن پیام هشدار</label>
                                             <input
                                                type="text"
                                                id="eyeStrainMessage"
                                                name="eyeStrainMessage"
                                                value={localSettings.eyeStrainMessage}
                                                onChange={handleChange}
                                                className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                                            />
                                        </div>
                                   </div>
                               )}
                            </div>
                             <div className="mt-4 bg-amber-500/10 p-3 rounded-lg flex items-start ring-1 ring-amber-500/30 text-xs">
                                <AlertIcon className="h-5 w-5 text-amber-300 shrink-0 ml-2" />
                                <p className="text-amber-200">
                                    برای دریافت اعلان‌ها، باید به مرورگر اجازه نمایش آن‌ها را بدهید.
                                </p>
                            </div>
                        </section>

                        <div className="border-t border-slate-700"></div>

                        <section>
                            <h4 className="font-semibold text-slate-200 mb-3">امنیت</h4>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <FormToggle label="قفل خودکار پس از عدم فعالیت" id="autoLockEnabled" checked={localSettings.autoLockEnabled} onChange={() => handleToggle('autoLockEnabled')} description="در صورت عدم فعالیت کاربر، کلید اصلی از حافظه پاک می‌شود." />
                                    {localSettings.autoLockEnabled && (
                                        <div className="grid grid-cols-2 gap-4 pl-4 border-r-2 border-slate-700 animate-fade-in">
                                            <FormInput label="زمان عدم فعالیت" id="autoLockMinutes" value={localSettings.autoLockMinutes} onChange={handleChange} unit="دقیقه" min={1} />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <FormToggle label="پاک‌سازی خودکار کلیپ‌بورد" id="clipboardAutoClearEnabled" checked={localSettings.clipboardAutoClearEnabled} onChange={() => handleToggle('clipboardAutoClearEnabled')} description="پس از کپی رمزها، کلیپ‌بورد به صورت خودکار پاک می‌شود." />
                                    {localSettings.clipboardAutoClearEnabled && (
                                        <div className="grid grid-cols-2 gap-4 pl-4 border-r-2 border-slate-700 animate-fade-in">
                                            <FormInput label="تاخیر پاک‌سازی" id="clipboardClearSeconds" value={localSettings.clipboardClearSeconds} onChange={handleChange} unit="ثانیه" min={5} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="border-t border-slate-700"></div>

                        <section>
                            <h4 className="font-semibold text-slate-200 mb-3">پشتیبان‌گیری</h4>
                            <p className="text-xs text-slate-400 mb-3">فایل بکاپ شامل تمام داده‌های ماژول‌ها و تنظیمات است. پیشنهاد می‌شود از بکاپ رمزنگاری‌شده استفاده کنید.</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button type="button" onClick={exportEncrypted} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold transition">دریافت بکاپ رمزنگاری‌شده</button>
                                <button type="button" onClick={exportPlain} className="py-2 px-4 bg-slate-600 hover:bg-slate-700 text-white rounded-md text-sm transition">دریافت بکاپ ساده (JSON)</button>
                            </div>
                            <div className="mt-3 bg-rose-500/10 p-3 rounded-lg ring-1 ring-rose-500/30 text-xs text-rose-200">
                                هشدار: بکاپ ساده به‌صورت رمزنگاری‌نشده است و فقط برای شرایط اضطراری توصیه می‌شود.
                            </div>
                        </section>

                    </main>

                    <footer className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end">
                        <button type="submit" className="py-2 px-5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-400">ذخیره تغییرات</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};