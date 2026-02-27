import React, { ChangeEvent, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { AccountantData, Person, LedgerEntry } from '../types';
import { EditIcon, DeleteIcon, CheckCircleIcon, ArrowRightIcon, EyeIcon, CloseIcon, UserCircleIcon } from '../../../components/Icons';
import { useAccountantStore } from '../store';
import { FormInput, FormSelect, JalaliDatePicker, LEDGER_UNITS, getLedgerUnitConfig, formatCurrency, formatDate, formatLedgerAmount, ImageFromRef, ReceiptPreview } from '../SmartAccountantShared';
import { ConfirmDialog } from '../ConfirmDialog';
import { isImageRef, saveImageDataURL, getObjectURLByRef, deleteImageByRef } from '../../../lib/idb-images';

export const PeopleView = ({ data, onEditPerson, onDeletePerson, onEditLedger, onDeleteLedger, onSettle, currentPerson, setCurrentPerson, onViewLedger }: { data: AccountantData; onEditPerson: (person: Person) => void; onDeletePerson: (id: string) => void; onEditLedger: (entry: LedgerEntry) => void; onDeleteLedger: (personId: string, ledgerId: string) => void; onSettle: (personId: string, ledgerId: string) => void; currentPerson: Person | null; setCurrentPerson: (person: Person | null) => void; onViewLedger?: (entry: LedgerEntry) => void }) => {
    const { saveLedgerEntry } = useAccountantStore.getState();
    const peopleOrder = useAccountantStore(state => state.peopleOrder);
    const setPeopleOrder = useAccountantStore(state => state.setPeopleOrder);
    const [qType, setQType] = useState<'debt' | 'credit'>('debt');
    const [qUnit, setQUnit] = useState<'toman' | 'gold_mg' | 'btc' | 'usdt'>('toman');
    const [qAmount, setQAmount] = useState<string>('');
    const [qDesc, setQDesc] = useState<string>('');
    const [qDate, setQDate] = useState<string>(() => new Date().toISOString());
    const [showOnlyOpen, setShowOnlyOpen] = useState<boolean>(false);
    const [qReceiptRef, setQReceiptRef] = useState<string | undefined>(undefined);
    const [qReceiptURL, setQReceiptURL] = useState<string | null>(null);
    const [qUploading, setQUploading] = useState<boolean>(false);
    const [receiptPreviewRef, setReceiptPreviewRef] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message: string; confirmText?: string; cancelText?: string; tone?: 'warning' | 'danger' | 'success'; onConfirm: () => void } | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [expandedLedgerId, setExpandedLedgerId] = useState<string | null>(null);

    const orderedPeople = useMemo(() => {
        const map = new Map(data.people.map(p => [p.id, p] as const));
        const ordered: Person[] = [];
        (peopleOrder || []).forEach(id => {
            const p = map.get(id);
            if (p) {
                ordered.push(p);
                map.delete(id);
            }
        });
        const remaining = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
        return [...ordered, ...remaining];
    }, [data.people, peopleOrder]);

    const handlePersonDrop = (fromId: string | null, toId: string) => {
        if (!fromId || fromId === toId) return;
        const current = peopleOrder && peopleOrder.length ? [...peopleOrder] : orderedPeople.map(p => p.id);
        const fromIdx = current.indexOf(fromId);
        const toIdx = current.indexOf(toId);
        if (fromIdx === -1 || toIdx === -1) return;
        current.splice(toIdx, 0, current.splice(fromIdx, 1)[0]);
        setPeopleOrder(current);
    };

    const handleQuickAdd = () => {
        if (!currentPerson) return;
        const amountNum = parseFloat(String(qAmount));
        if (!amountNum || !qDesc) return;
        const cfg = getLedgerUnitConfig(qUnit);
        const safeAmount = Number(amountNum.toFixed(cfg.maxDecimals));
        const newEntry = {
            id: Date.now().toString(),
            personId: currentPerson.id,
            type: qType,
            amount: safeAmount,
            unit: cfg.id,
            description: qDesc,
            date: qDate,
            isSettled: false,
            receiptImage: qReceiptRef,
        } as LedgerEntry;
        saveLedgerEntry(newEntry);
        setQAmount('');
        setQDesc('');
        setQType('debt');
        setQUnit('toman');
        setQDate(new Date().toISOString());
        setQReceiptRef(undefined);
        setQReceiptURL(null);
    };

    if (currentPerson) {
        const ledger = (data.ledger[currentPerson.id] || []).map(e => ({
            ...e,
            unit: (e as any).unit || 'toman',
        }));
        const totalsByUnit = ledger.reduce((acc: Record<string, number>, entry) => {
            if (entry.isSettled) return acc;
            const unit = (entry as any).unit || 'toman';
            const sign = entry.type === 'debt' ? 1 : -1;
            acc[unit] = (acc[unit] || 0) + sign * entry.amount;
            return acc;
        }, {});
        const balance = totalsByUnit['toman'] || 0;
        const unitEntries = (Object.entries(totalsByUnit) as [string, number][])
            .filter(([, value]) => Math.abs(value) > 0);

        const safeLedger = showOnlyOpen ? ledger.filter(l => !l.isSettled) : ledger;

        return (
            <div>
                 <div className="flex justify-between items-center mb-6 p-4 bg-slate-800 rounded-lg">
                    <button onClick={() => setCurrentPerson(null)} className="flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
                        <ArrowRightIcon />
                        <span>بازگشت به لیست</span>
                    </button>
                    <div className="text-left flex-1">
                        <h3 className="text-xl font-bold text-white">{currentPerson.name}</h3>
                        <p className={`font-semibold ${balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {balance > 0 ? `به شما ${formatCurrency(balance)} بدهکار است.` : balance < 0 ? `شما ${formatCurrency(Math.abs(balance))} بدهکارید.` : 'حساب تومان تسویه است.'}
                        </p>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {unitEntries.length === 0 ? (
                                <div className="text-slate-400 text-sm">هیچ بدهی یا طلبی ثبت نشده است.</div>
                            ) : (
                                unitEntries.map(([unit, value]) => {
                                    const cfg = getLedgerUnitConfig(unit);
                                    const isReceivable = value > 0;
                                    const amountStr =
                                        cfg.maxDecimals > 0
                                            ? Math.abs(value).toLocaleString('fa-IR', { maximumFractionDigits: cfg.maxDecimals })
                                            : Math.abs(value).toLocaleString('fa-IR');
                                    return (
                                        <div key={unit} className="bg-slate-900/60 rounded-lg p-2.5 ring-1 ring-slate-700/60 flex items-center justify-between">
                                            <div className="text-xs text-slate-400">{cfg.label}</div>
                                            <div className={`text-xs font-bold ${isReceivable ? 'text-emerald-300' : 'text-rose-300'}`}>
                                                {isReceivable ? 'طلب' : 'بدهی'} {amountStr} {cfg.suffix}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-5 p-4 bg-slate-900/50 rounded-lg ring-1 ring-slate-700">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <button onClick={() => setQType('debt')} className={`px-3 py-1 rounded-full text-xs border ${qType==='debt' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>بهش دادم</button>
                        <button onClick={() => setQType('credit')} className={`px-3 py-1 rounded-full text-xs border ${qType==='credit' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>ازش گرفتم</button>
                        <FormSelect
                            label=""
                            id="qUnit"
                            value={qUnit}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setQUnit(e.target.value as any)}
                        >
                            {LEDGER_UNITS.map(u => (
                                <option key={u.id} value={u.id}>{u.label}</option>
                            ))}
                        </FormSelect>
                        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                <input type="checkbox" checked={showOnlyOpen} onChange={(e) => setShowOnlyOpen(e.target.checked)} />
                                فقط موارد تسویه‌نشده
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-1">
                            <FormInput
                                label="مبلغ"
                                id="qAmount"
                                type="number"
                                value={qAmount}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    const cfg = getLedgerUnitConfig(qUnit);
                                    const raw = e.target.value;
                                    const parts = raw.split('.');
                                    if (parts[1] && parts[1].length > cfg.maxDecimals) {
                                        const trimmed = `${parts[0]}.${parts[1].slice(0, cfg.maxDecimals)}`;
                                        setQAmount(trimmed);
                                    } else {
                                        setQAmount(raw);
                                    }
                                }}
                                step={getLedgerUnitConfig(qUnit).step}
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <FormInput label="توضیحات" id="qDesc" value={qDesc} onChange={(e) => setQDesc((e.target as HTMLInputElement).value)} required />
                        </div>
                        <div className="md:col-span-2">
                            <JalaliDatePicker label="تاریخ" id="qDate" value={qDate} onChange={(iso) => setQDate(iso)} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-300 mb-1">رسید</label>
                            <div className="flex items-center gap-2">
                                <label htmlFor="q-ledger-receipt-upload" className={`cursor-pointer px-3 py-2 rounded-md text-sm ${qUploading ? 'bg-slate-600 text-slate-300' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
                                    {qUploading ? 'در حال آپلود...' : 'بارگذاری'}
                                </label>
                                <input id="q-ledger-receipt-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    setQUploading(true);
                                    reader.onloadend = async () => {
                                        try {
                                            const dataUrl = reader.result as string;
                                            const ref = await saveImageDataURL(dataUrl);
                                            setQReceiptRef(ref);
                                            const url = await getObjectURLByRef(ref);
                                            setQReceiptURL(url);
                                        } catch (err) {
                                            console.error('Quick ledger receipt upload failed', err);
                                        } finally {
                                            setQUploading(false);
                                        }
                                    };
                                    reader.readAsDataURL(f);
                                }} />
                                {qReceiptURL && (
                                    <>
                                        <img src={qReceiptURL} alt="رسید" className="h-10 w-10 rounded-md object-cover hidden sm:block" />
                                        <button type="button" onClick={() => setReceiptPreviewRef(qReceiptRef || null)} className="text-sky-400 text-xs hover:underline">نمایش</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-left mt-3">
                        <button onClick={handleQuickAdd} className="py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={!qAmount || !qDesc || qUploading}>ثبت سریع</button>
                    </div>
                </div>
                {safeLedger.length === 0 ? <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">موردی یافت نشد.</p> :
                <div className="space-y-3">
                    {safeLedger.map(entry => (
                        <React.Fragment key={entry.id}>
                            <div
                                className={`bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 cursor-pointer hover:bg-slate-800 hover:ring-slate-600 transition ${entry.isSettled ? 'opacity-50' : ''}`}
                                onClick={() => {
                                    if (onViewLedger) onViewLedger(entry);
                                    else setExpandedLedgerId(prev => prev === entry.id ? null : entry.id);
                                }}
                            >
                                <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-100 truncate">{entry.description}</p>
                                        <p className="text-sm text-slate-400 truncate">{formatDate(entry.date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                                    <p className={`font-bold text-sm sm:text-base ${entry.type === 'debt' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatLedgerAmount(entry)}</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedLedgerId(prev => prev === entry.id ? null : entry.id);
                                    }}
                                    className="px-2 py-1 rounded-md text-[11px] bg-slate-700/60 text-slate-200 hover:bg-slate-700 transition"
                                >
                                    جزئیات
                                </button>
                                    {entry.receiptImage && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReceiptPreviewRef(entry.receiptImage!);
                                            }}
                                            className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"
                                            title="مشاهده رسید"
                                        >
                                            <EyeIcon />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmState({
                                                open: true,
                                                title: entry.isSettled ? 'لغو تسویه ردیف' : 'تسویه ردیف',
                                                message: entry.isSettled
                                                    ? 'آیا از لغو تسویه این ردیف اطمینان دارید؟'
                                                    : 'آیا از تسویه این ردیف اطمینان دارید؟ در صورت فعال بودن فیلتر «فقط موارد تسویه‌نشده»، این ردیف از لیست پنهان می‌شود.',
                                                confirmText: entry.isSettled ? 'بله، لغو تسویه شود' : 'بله، تسویه شود',
                                                cancelText: 'انصراف',
                                                tone: entry.isSettled ? 'warning' : 'success',
                                                onConfirm: () => onSettle(currentPerson.id, entry.id),
                                            });
                                        }}
                                        className="p-1.5 hover:bg-slate-700 rounded-full"
                                        title={entry.isSettled ? 'لغو تسویه' : 'تسویه'}
                                    >
                                       {entry.isSettled ? <CloseIcon /> : <CheckCircleIcon />}
                                    </button>
                                    <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                                       <button onClick={(e) => { e.stopPropagation(); onEditLedger({...entry, personId: currentPerson.id}); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition"><EditIcon/></button>
                                       <button onClick={(e) => { e.stopPropagation(); onDeleteLedger(currentPerson.id, entry.id); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition"><DeleteIcon/></button>
                                    </div>
                                </div>
                            </div>
                            {expandedLedgerId === entry.id && (
                                <div className="bg-slate-900/60 rounded-lg p-3 ring-1 ring-slate-700">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">نوع</span>
                                            <span className={`${entry.type === 'debt' ? 'text-emerald-400' : 'text-rose-400'} font-medium`}>{entry.type === 'debt' ? 'بهش دادم' : 'ازش گرفتم'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">وضعیت</span>
                                            <span className={`${entry.isSettled ? 'text-emerald-400' : 'text-amber-400'} font-medium`}>{entry.isSettled ? 'تسویه شده' : 'تسویه نشده'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">واحد</span>
                                            <span className="text-slate-200">{getLedgerUnitConfig((entry as any).unit || 'toman').label}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">تاریخ</span>
                                            <span className="text-slate-200">{moment(entry.date).locale('fa').format('dddd jD jMMMM jYYYY - HH:mm')}</span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <span className="text-slate-500 block mb-1">بابت</span>
                                        <p className="text-slate-200 bg-slate-800/50 p-2 rounded-md border border-slate-700">{entry.description || 'بدون توضیحات'}</p>
                                    </div>
                                    {entry.receiptImage && (
                                        <div className="mt-3">
                                            <span className="text-slate-500 block mb-1">رسید</span>
                                            <ImageFromRef srcOrRef={entry.receiptImage} className="w-full h-auto object-cover max-h-48 bg-slate-950 rounded-md ring-1 ring-slate-700" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                }
                {receiptPreviewRef && (
                    <ReceiptPreview
                        refOrUrl={receiptPreviewRef}
                        title="رسید هزینه"
                        downloadLabel="دانلود تصویر"
                        onDelete={async () => {
                            try {
                                if (isImageRef(receiptPreviewRef || '')) {
                                    await deleteImageByRef(receiptPreviewRef!);
                                }
                                if (receiptPreviewRef === qReceiptRef) {
                                    setQReceiptRef(undefined);
                                    setQReceiptURL(null);
                                    setReceiptPreviewRef(null);
                                    return;
                                }
                                const entry = (data.ledger[currentPerson!.id] || []).find(e => e.receiptImage === receiptPreviewRef);
                                if (entry) {
                                    useAccountantStore.getState().saveLedgerEntry({ ...entry, receiptImage: undefined });
                                }
                            } finally {
                                setReceiptPreviewRef(null);
                            }
                        }}
                        onClose={() => setReceiptPreviewRef(null)}
                    />
                )}
                {confirmState && (
                    <ConfirmDialog
                        open={!!confirmState.open}
                        title={confirmState.title || 'تایید عملیات'}
                        message={confirmState.message || ''}
                        confirmText={confirmState.confirmText || 'تایید'}
                        cancelText={confirmState.cancelText || 'لغو'}
                        tone={confirmState.tone || 'warning'}
                        onConfirm={() => {
                            try {
                                confirmState.onConfirm();
                            } finally {
                            }
                        }}
                        onClose={() => setConfirmState(null)}
                    />
                )}
            </div>
        )
    }

    if (data.people.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز شخصی برای حساب و کتاب اضافه نشده است.</p>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {orderedPeople.map(person => {
                    const ledger = (data.ledger[person.id] || []).map(e => ({
                        ...e,
                        unit: (e as any).unit || 'toman',
                    }));

                    const totalsByUnit = ledger.reduce((acc: Record<string, number>, entry) => {
                        if (entry.isSettled) return acc;
                        const unit = (entry as any).unit || 'toman';
                        const sign = entry.type === 'debt' ? 1 : -1;
                        acc[unit] = (acc[unit] || 0) + sign * entry.amount;
                        return acc;
                    }, {});

                    const tomanBalance = totalsByUnit['toman'] || 0;
                    return (
                        <div
                            key={person.id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', person.id);
                                setDraggingId(person.id);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                const fromId = e.dataTransfer.getData('text/plain') || draggingId;
                                handlePersonDrop(fromId, person.id);
                                setDraggingId(null);
                            }}
                            onDragEnd={() => setDraggingId(null)}
                            className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700 cursor-pointer transition-all hover:ring-sky-400 hover:-translate-y-1"
                            onClick={() => setCurrentPerson(person)}
                        >
                            <div className="flex justify-between items-start">
                                 <div className="flex items-center space-x-4 space-x-reverse">
                                    <div className="w-16 h-16 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        {person.avatar ? (
                                          <ImageFromRef srcOrRef={person.avatar} className="w-full h-full object-cover" alt={person.name} />
                                        ) : <UserCircleIcon />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-100 text-lg">{person.name}</h4>
                                        <p className={`text-sm font-semibold ${tomanBalance > 0 ? 'text-emerald-400' : tomanBalance < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                            {tomanBalance > 0 ? `طلب: ${formatCurrency(tomanBalance)}` : tomanBalance < 0 ? `بدهی: ${formatCurrency(Math.abs(tomanBalance))}` : 'تسویه (تومان)'}
                                        </p>
                                        {(Object.entries(totalsByUnit) as [string, number][])
                                            .filter(([unit]) => unit !== 'toman' && Math.abs(totalsByUnit[unit]) > 0)
                                            .map(([unit, value]) => {
                                                const cfg = getLedgerUnitConfig(unit);
                                                const isReceivable = value > 0;
                                                const amountStr =
                                                    cfg.maxDecimals > 0
                                                        ? Math.abs(value).toLocaleString('fa-IR', {
                                                              maximumFractionDigits: cfg.maxDecimals,
                                                          })
                                                        : Math.abs(value).toLocaleString('fa-IR');
                                                return (
                                                    <p
                                                        key={unit}
                                                        className={`text-xs mt-0.5 ${isReceivable ? 'text-emerald-300' : 'text-rose-300'}`}
                                                    >
                                                        {isReceivable
                                                            ? `طلب: ${amountStr} ${cfg.suffix}`
                                                            : `بدهی: ${amountStr} ${cfg.suffix}`}
                                                    </p>
                                                );
                                            })}
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
            <div>
                <h3 className="text-lg font-bold text-slate-100 mb-3">تراکنش‌های اخیر با دیگران</h3>
                {(() => {
                    const recent = Object.values(data.ledger || {})
                        .flat()
                        .map(e => ({ ...e, unit: (e as any).unit || 'toman' }))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 30);
                    if (recent.length === 0) {
                        return <p className="text-slate-500 text-sm bg-slate-800/20 rounded-lg p-4">هنوز تراکنشی ثبت نشده است.</p>;
                    }
                    return (
                        <div className="space-y-3">
                            {recent.map(entry => {
                                const person = data.people.find(p => p.id === entry.personId);
                                return (
                                    <div
                                        key={entry.id}
                                        className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 cursor-pointer hover:bg-slate-800 hover:ring-slate-600 transition"
                                        onClick={() => onViewLedger && onViewLedger(entry)}
                                    >
                                        <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-100 truncate">{entry.description || '—'}</p>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {person?.name || 'نامشخص'} • {formatDate(entry.date)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                                            <p className={`font-bold text-sm sm:text-base ${entry.type === 'debt' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatLedgerAmount(entry)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
