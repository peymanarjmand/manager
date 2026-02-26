import React, { useEffect, useMemo, useState, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { AccountantData, Transaction, Asset, Person, LedgerEntry, InstallmentPlan, InstallmentPayment, CheckStatus } from './types';
import { ChecksIcon, EditIcon, DeleteIcon, CheckCircleIcon, UncheckedCircleIcon, ArrowRightIcon, EyeIcon, CloseIcon, UserCircleIcon } from '../../components/Icons';
import { useAccountantStore } from './store';
import { FormInput, FormSelect, JalaliDatePicker, LEDGER_UNITS, getLedgerUnitConfig, formatCurrency, formatDate, formatLedgerAmount, ImageFromRef, ReceiptPreview } from './SmartAccountantShared';
import { ConfirmDialog } from './ConfirmDialog';
import { isImageRef, saveImageDataURL, getObjectURLByRef, deleteImageByRef } from '../../lib/idb-images';

export const SummaryView = ({ data }: { data: AccountantData }) => {
    const [selectedMonthISO, setSelectedMonthISO] = useState<string>(() => moment().startOf('jMonth').toISOString());

    const startOfSelected = useMemo(() => moment(selectedMonthISO).startOf('jMonth'), [selectedMonthISO]);
    const endOfSelected = useMemo(() => moment(selectedMonthISO).endOf('jMonth'), [selectedMonthISO]);
    const selectedMonthLabel = useMemo(() => startOfSelected.clone().locale('fa').format('jMMMM jYYYY'), [startOfSelected]);
    const canGoNextMonth = useMemo(() => startOfSelected.isBefore(moment().startOf('jMonth')), [startOfSelected]);

    const totalAssets = useMemo(() => data.assets.reduce((sum, asset) => sum + (asset.currentValue * (asset.quantity || 1)), 0), [data.assets]);
    
    const incomeOfMonth = useMemo(() => data.transactions
        .filter(t => t.type === 'income' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);

    const expensesOfMonth = useMemo(() => data.transactions
        .filter(t => t.type === 'expense' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);
    
    const { totalDebt, totalCredit } = useMemo(() => {
        let receivables = 0;
        let payables = 0;
        Object.values(data.ledger).forEach((personEntries: any[]) => {
            const netForPerson = (personEntries || []).reduce((acc, entry) => {
                if (entry.isSettled) return acc;
                const unit = (entry as any).unit || 'toman';
                if (unit !== 'toman') return acc;
                if (entry.type === 'debt') return acc + entry.amount;
                return acc - entry.amount;
            }, 0);
            if (netForPerson > 0) receivables += netForPerson;
            else if (netForPerson < 0) payables += Math.abs(netForPerson);
        });
        return { totalDebt: receivables, totalCredit: payables };
    }, [data.ledger]);

    const monthlyInstallments = useMemo(() => {
        const jjYear = startOfSelected.jYear();
        const jjMonth = startOfSelected.jMonth() + 1;
        const allPaymentsThisMonth = data.installments.flatMap(plan => plan.payments)
            .filter(payment => {
                const d = moment(payment.dueDate);
                return d.jYear() === jjYear && (d.jMonth() + 1) === jjMonth;
            });

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
    }, [data.installments, selectedMonthISO]);

    const computeInstallmentMonth = (m: any) => {
        const jy = m.jYear();
        const jm = m.jMonth() + 1;
        const s = m.clone().startOf('jMonth');
        const all = data.installments.flatMap(pl => pl.payments).filter(p => {
            const d = moment(p.dueDate);
            return d.jYear() === jy && (d.jMonth() + 1) === jm;
        });
        const total = all.reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
        const paid = all.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0);
        const unpaid = total - paid;
        return { total, paid, unpaid, label: m.clone().locale('fa').format('jMMM jYY'), iso: s.toISOString() };
    };
    const prevInstallments = useMemo(() => computeInstallmentMonth(startOfSelected.clone().subtract(1, 'jMonth')), [selectedMonthISO, data.installments]);
    const nextInstallments = useMemo(() => {
        return Array.from({ length: 6 }).map((_, i) => computeInstallmentMonth(startOfSelected.clone().add(i + 1, 'jMonth')));
    }, [selectedMonthISO, data.installments]);
    
    const monthlyIssuedChecks = useMemo(() => {
        const startOfMonth = startOfSelected;
        const endOfMonth = endOfSelected;

        return data.checks
            .filter(c => c.type === 'issued' && c.status === 'pending' && moment(c.dueDate).isBetween(startOfMonth, endOfMonth, undefined, '[]'))
            .reduce((sum, c) => sum + c.amount, 0);
    }, [data.checks, selectedMonthISO]);

    const netWorth = totalAssets + totalDebt - totalCredit;
    
    const StatCard = ({ title, value, colorClass }) => (
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
            <h3 className="text-slate-400 text-md">{title}</h3>
            <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{formatCurrency(value)}</p>
        </div>
    );

    const monthsHistory = useMemo(() => {
        const base = moment().startOf('jMonth');
        return Array.from({ length: 12 }).map((_, i) => base.clone().subtract(i, 'jMonth'));
    }, []);

    const jYear = startOfSelected.jYear();
    const jMonth = startOfSelected.jMonth() + 1;
    const currentFund = useMemo(() => (data.funds || []).find((f: any) => f.year === jYear && f.month === jMonth), [data.funds, jYear, jMonth]);
    const [isEditingFund, setIsEditingFund] = useState<boolean>(false);
    const [fundInput, setFundInput] = useState<string>(() => String(currentFund?.openingAmount ?? ''));
    useEffect(() => { setFundInput(String(currentFund?.openingAmount ?? '')); }, [currentFund?.openingAmount, jYear, jMonth]);

    const saveFund = () => {
        const opening = Number(String(fundInput).replace(/,/g, '')) || 0;
        const id = `${jYear}-${String(jMonth).padStart(2,'0')}`;
        const payload = { id, year: jYear, month: jMonth, openingAmount: opening };
        const { saveMonthlyFund } = useAccountantStore.getState() as any;
        saveMonthlyFund(payload);
        setIsEditingFund(false);
    };

    const incomeTx = useMemo(() => data.transactions
        .filter(t => t.type === 'income' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);
    const expenseTx = useMemo(() => data.transactions
        .filter(t => t.type === 'expense' && moment(t.date).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, t) => sum + t.amount, 0), [data.transactions, selectedMonthISO]);

    const ledgerEntries = useMemo(() => Object.values(data.ledger || {}).flat().filter(e => moment(e.date).isBetween(startOfSelected, endOfSelected, undefined, '[]')), [data.ledger, selectedMonthISO]);
    const ledgerInflow = useMemo(() => ledgerEntries.filter(e => e.type === 'credit' && !e.isSettled).reduce((s, e) => s + e.amount, 0) + ledgerEntries.filter(e => e.type === 'credit' && e.isSettled).reduce((s,e)=>s+e.amount,0), [ledgerEntries]);
    const ledgerOutflow = useMemo(() => ledgerEntries.filter(e => e.type === 'debt' && !e.isSettled).reduce((s, e) => s + e.amount, 0) + ledgerEntries.filter(e => e.type === 'debt' && e.isSettled).reduce((s,e)=>s+e.amount,0), [ledgerEntries]);

    const installmentOut = useMemo(() => (data.installments || []).flatMap(p => p.payments)
        .filter(p => p.isPaid && p.paidDate && moment(p.paidDate).isBetween(startOfSelected, endOfSelected, undefined, '[]'))
        .reduce((sum, p) => sum + p.amount + (p.penalty || 0), 0), [data.installments, selectedMonthISO]);

    const checksCashed = useMemo(() => (data.checks || []).filter(c => c.status === 'cashed' && c.cashedDate && moment(c.cashedDate).isBetween(startOfSelected, endOfSelected, undefined, '[]')), [data.checks, selectedMonthISO]);
    const checksIn = useMemo(() => checksCashed.filter(c => c.type === 'received').reduce((s, c) => s + c.amount, 0), [checksCashed]);
    const checksOut = useMemo(() => checksCashed.filter(c => c.type === 'issued').reduce((s, c) => s + c.amount, 0), [checksCashed]);

    const socialInsurance = (data as any).socialInsurance as any[] | undefined;
    const socialOut = useMemo(() => socialInsurance?.filter((p: any) => p.payDate && moment(p.payDate).isBetween(startOfSelected, endOfSelected, undefined, '[]')).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0) || 0, [socialInsurance, selectedMonthISO]);
    const darfakOut = useMemo(() => (useAccountantStore.getState().darfak || []).filter((e: any) => e.date && moment(e.date).isBetween(startOfSelected, endOfSelected, undefined, '[]')).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0), [selectedMonthISO]);

    const inflowTotal = useMemo(() => incomeTx + ledgerInflow + checksIn, [incomeTx, ledgerInflow, checksIn]);
    const outflowTotal = useMemo(() => expenseTx + ledgerOutflow + installmentOut + checksOut + socialOut + darfakOut, [expenseTx, ledgerOutflow, installmentOut, checksOut, socialOut, darfakOut]);
    const openingAmount = Number(currentFund?.openingAmount || 0);
    const monthEndBalance = useMemo(() => openingAmount + inflowTotal - outflowTotal, [openingAmount, inflowTotal, outflowTotal]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900/40 p-3 md:p-4 rounded-lg ring-1 ring-slate-800">
                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-1.5 rounded-md bg-slate-700 text-slate-100 hover:bg-slate-600"
                        onClick={() => setSelectedMonthISO(startOfSelected.clone().subtract(1, 'jMonth').toISOString())}
                    >ماه قبل</button>
                    <button
                        className="px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-700"
                        onClick={() => setSelectedMonthISO(moment().startOf('jMonth').toISOString())}
                    >ماه جاری</button>
                </div>
                <div className="text-slate-200 font-bold">{selectedMonthLabel}</div>
                <button
                    className={`px-3 py-1.5 rounded-md ${canGoNextMonth ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    onClick={() => canGoNextMonth && setSelectedMonthISO(startOfSelected.clone().add(1, 'jMonth').toISOString())}
                    disabled={!canGoNextMonth}
                >ماه بعد</button>
            </div>

            <div className="flex flex-wrap gap-2">
                {monthsHistory.map(m => {
                    const isActive = m.isSame(startOfSelected, 'jMonth');
                    const iso = m.toISOString();
                    return (
                        <button
                            key={iso}
                            onClick={() => setSelectedMonthISO(iso)}
                            className={`px-3 py-1 rounded-full text-xs border ${isActive ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600 hover:bg-slate-700'}`}
                            title={m.locale('fa').format('jMMMM jYYYY')}
                        >{m.locale('fa').format('jMMM jYY')}</button>
                    );
                })}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 md:p-5 ring-1 ring-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-slate-300 text-sm">صندوق نقدی {selectedMonthLabel}</div>
                    <button className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs" onClick={() => setIsEditingFund(v => !v)}>{isEditingFund ? 'انصراف' : (currentFund ? 'ویرایش موجودی اولیه' : 'تنظیم موجودی اولیه')}</button>
                </div>
                {isEditingFund ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">موجودی ابتدای ماه (تومان)</label>
                            <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3" value={fundInput} onChange={(e)=>setFundInput((e.target as HTMLInputElement).value)} />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2">
                            <button className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold" onClick={saveFund}>ذخیره</button>
                            {currentFund && <div className="text-slate-400 text-xs">مقدار فعلی: {formatCurrency(currentFund.openingAmount)}</div>}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700">ابتدای ماه: <span className="font-bold text-slate-100">{formatCurrency(openingAmount)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700">ورودی‌ها: <span className="font-bold text-emerald-400">{formatCurrency(inflowTotal)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700">خروجی‌ها: <span className="font-bold text-rose-400">{formatCurrency(outflowTotal)}</span></div>
                        <div className="bg-slate-900/60 rounded-lg p-3 ring-1 ring-slate-700">مانده ماه: <span className="font-extrabold text-sky-400">{formatCurrency(monthEndBalance)}</span></div>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="ارزش خالص دارایی‌ها" value={netWorth} colorClass="text-sky-400" />
                <StatCard title={`درآمد ${selectedMonthLabel}`} value={incomeOfMonth} colorClass="text-emerald-400" />
                <StatCard title={`هزینه ${selectedMonthLabel}`} value={expensesOfMonth} colorClass="text-rose-400" />
            </div>

            {monthlyInstallments.hasInstallments && (
                <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 space-y-4">
                    <h3 className="text-slate-300 text-lg font-semibold">
                        خلاصه اقساط {selectedMonthLabel}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700 flex items-center justify-between"><span className="text-slate-300">کل اقساط این ماه</span><span className="font-bold text-slate-100">{formatCurrency(monthlyInstallments.totalAmount)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700 flex items-center justify-between"><span className="text-slate-300">پرداخت شده</span><span className="font-bold text-emerald-400">{formatCurrency(monthlyInstallments.paidAmount)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-slate-700 flex items-center justify-between"><span className="text-slate-300">مانده</span><span className="font-bold text-rose-400">{formatCurrency(monthlyInstallments.unpaidAmount)}</span></div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 md:h-4 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${monthlyInstallments.progress}%` }}></div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="text-slate-400 text-sm">ماه قبل: <button className="px-2 py-1 rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-xs" onClick={() => setSelectedMonthISO(prevInstallments.iso)} title="مشاهده ماه قبل">{prevInstallments.label} • {formatCurrency(prevInstallments.total)}</button></div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-slate-400 text-sm">ماه‌های آینده:</span>
                            {nextInstallments.map((m) => (
                                <button key={m.iso} className="px-2 py-1 rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-xs" onClick={() => setSelectedMonthISO(m.iso)} title={`اقساط ${m.label}`}>{m.label} • {formatCurrency(m.total)}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <StatCard title="مجموع طلب شما از دیگران" value={totalDebt} colorClass="text-emerald-400" />
                 <StatCard title="مجموع بدهی شما به دیگران" value={totalCredit} colorClass="text-rose-400" />
                 <StatCard title={`چک‌های صادره ${selectedMonthLabel}`} value={monthlyIssuedChecks} colorClass="text-amber-400" />
             </div>
        </div>
    )
};

export const TransactionsView = ({ transactions, onEdit, onDelete, onView }) => {
    const [selectedDate, setSelectedDate] = useState(() => moment());
    const [filterCategory, setFilterCategory] = useState('all');

    const changeMonth = (amount: number) => {
        setSelectedDate(prev => prev.clone().add(amount, 'jMonth'));
    };

    const currentMonthLabel = useMemo(() => selectedDate.clone().locale('fa').format('jMMMM jYYYY'), [selectedDate]);

    const allCategories = useMemo(() => {
        const cats = new Set<string>(transactions.map(t => t.category));
        return Array.from(cats);
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = moment(t.date);
            const matchesMonth = tDate.jYear() === selectedDate.jYear() && tDate.jMonth() === selectedDate.jMonth();
            const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
            return matchesMonth && matchesCategory;
        });
    }, [transactions, selectedDate, filterCategory]);

    const income = filteredTransactions.filter(t => t.type === 'income');
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    
    const ChevronRight = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>;
    const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-800/40 p-3 rounded-xl ring-1 ring-slate-700/50">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 ring-1 ring-slate-700 shadow-sm">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition" title="ماه قبل">
                        <ChevronRight />
                    </button>
                    <span className="w-36 text-center font-bold text-slate-200 text-sm select-none">{currentMonthLabel}</span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition" title="ماه بعد">
                        <ChevronLeft />
                    </button>
                </div>

                <div className="w-full sm:w-48 relative">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="w-full appearance-none bg-slate-800 text-slate-300 text-sm rounded-lg border-none ring-1 ring-slate-700 focus:ring-2 focus:ring-sky-500 p-2.5 pr-8 cursor-pointer"
                    >
                        <option value="all">همه دسته‌بندی‌ها</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                       <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
                    <span>درآمدها</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">{income.length}</span>
                </h3>
                {income.length > 0 ? (
                    <TransactionList transactions={income} onEdit={onEdit} onDelete={onDelete} onView={onView} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg text-sm">درآمدی برای {filterCategory !== 'all' ? 'این دسته‌بندی در' : ''} این ماه ثبت نشده است.</p>}
            </div>
             <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-4 text-rose-400 flex items-center gap-2">
                    <span>هزینه‌ها</span>
                    <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-1 rounded-full border border-rose-500/20">{expenses.length}</span>
                </h3>
                {expenses.length > 0 ? (
                    <TransactionList transactions={expenses} onEdit={onEdit} onDelete={onDelete} onView={onView} />
                ) : <p className="text-slate-500 text-center py-8 bg-slate-800/20 rounded-lg text-sm">هزینه‌ای برای {filterCategory !== 'all' ? 'این دسته‌بندی در' : ''} این ماه ثبت نشده است.</p>}
            </div>
        </div>
    );
};

export const TransactionList = ({ transactions, onEdit, onDelete, onView }) => (
    <div className="space-y-3">
        {transactions.map(t => (
            <div 
                key={t.id} 
                className="bg-slate-800/50 rounded-lg p-3 sm:p-4 flex items-center justify-between ring-1 ring-slate-700/50 cursor-pointer hover:bg-slate-800 hover:ring-slate-600 transition group"
                onClick={() => onView && onView(t)}
            >
                <div className="flex items-center space-x-3 sm:space-x-4 space-x-reverse flex-1 min-w-0">
                    {t.receiptImage && (
                        <ImageFromRef srcOrRef={t.receiptImage} className="h-12 w-12 rounded-md object-cover hidden sm:block" />
                    )}
                    <div className="min-w-0">
                        <p className="font-bold text-slate-100 truncate group-hover:text-sky-300 transition-colors">{t.description}</p>
                        <p className="text-sm text-slate-400 truncate">{t.category} • {formatDate(t.date)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                    <p className={`font-bold text-sm sm:text-base ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(t.amount)}</p>
                     <div className="flex items-center space-x-1 space-x-reverse text-slate-400">
                       <button onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-sky-400 transition" aria-label="ویرایش"><EditIcon/></button>
                       <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="p-1.5 hover:bg-slate-700 rounded-full hover:text-rose-400 transition" aria-label="حذف"><DeleteIcon/></button>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export const LedgerEntrySummaryModal = ({ entry, person, onClose }: { entry: LedgerEntry | null; person: Person | null; onClose: () => void }) => {
    if (!entry) return null;
    const isDebt = entry.type === 'debt';
    const typeLabel = isDebt ? 'بهش دادم' : 'ازش گرفتم';
    const statusLabel = entry.isSettled ? 'تسویه شده' : 'تسویه نشده';
    const colorClass = isDebt ? 'text-emerald-400' : 'text-rose-400';
    const bgClass = isDebt ? 'bg-emerald-500/10' : 'bg-rose-500/10';
    const borderClass = isDebt ? 'border-emerald-500/20' : 'border-rose-500/20';
    const unitCfg = getLedgerUnitConfig((entry as any).unit || 'toman');
    const dateLabel = moment(entry.date).locale('fa').format('dddd jD jMMMM jYYYY - HH:mm');

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl ring-1 ring-slate-700 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-800 p-6 border-b border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-100">خلاصه تراکنش</h3>
                            <p className="text-xs text-slate-400 mt-1">{person?.name || 'نامشخص'}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-700 rounded-full">
                            <CloseIcon />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${bgClass} ${colorClass} border ${borderClass}`}>{typeLabel}</span>
                        <h2 className={`text-3xl font-bold ${colorClass} tracking-tight`}>{formatLedgerAmount(entry)}</h2>
                    </div>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                        <span className="text-slate-500 text-sm">تاریخ</span>
                        <span className="text-slate-200 text-sm">{dateLabel}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                        <span className="text-slate-500 text-sm">وضعیت</span>
                        <span className={`text-sm font-medium ${entry.isSettled ? 'text-emerald-400' : 'text-amber-400'}`}>{statusLabel}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-800">
                        <span className="text-slate-500 text-sm">واحد</span>
                        <span className="text-slate-200 text-sm">{unitCfg.label}</span>
                    </div>
                    <div className="py-2">
                        <span className="text-slate-500 text-sm block mb-2">بابت</span>
                        <p className="text-slate-200 text-base leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-800">{entry.description || 'بدون توضیحات'}</p>
                    </div>
                    {entry.receiptImage && (
                        <div>
                            <span className="text-slate-500 text-sm block mb-2">رسید</span>
                            <div className="rounded-xl overflow-hidden border border-slate-700">
                                <ImageFromRef srcOrRef={entry.receiptImage} className="w-full h-auto object-cover max-h-64 bg-slate-950" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-800/50 text-left">
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition shadow-lg">
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AssetsView = ({ assets, onEdit, onDelete }) => {
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
        const { balance } = ledger.reduce((acc, entry) => {
            if (!entry.isSettled) {
                if ((entry as any).unit === 'toman') {
                    if (entry.type === 'debt') acc.balance += entry.amount;
                    else acc.balance -= entry.amount;
                }
            }
            return acc;
        }, { balance: 0 });

        const safeLedger = showOnlyOpen ? ledger.filter(l => !l.isSettled) : ledger;

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

export const ChecksView = ({ checks, onEdit, onDelete, onStatusChange }) => {
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
        return 0;
    }
    
    const numberOfPayments = payments.length;
    const loanTermInYears = numberOfPayments / 12;

    if (loanTermInYears <= 0) {
        return null;
    }

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

export const InstallmentsView = ({ installments, currentInstallment, setCurrentInstallment, onEditPlan, onDeletePlan, onEditPayment, onTogglePaidStatus }) => {
    const [showPaymentsList, setShowPaymentsList] = useState(false);

    const { installmentsSortMode, installmentsCustomOrder } = useAccountantStore();
    const { setInstallmentsSortMode, setInstallmentsCustomOrder } = useAccountantStore.getState();

    const today = useMemo(() => new Date(), []);
    const [instMonthISO, setInstMonthISO] = useState<string>(() => moment().startOf('jMonth').toISOString());
    const startOfMonth = useMemo(() => moment(instMonthISO).startOf('jMonth'), [instMonthISO]);
    const endOfMonth = useMemo(() => moment(instMonthISO).endOf('jMonth'), [instMonthISO]);
    const monthLabel = useMemo(() => startOfMonth.clone().locale('fa').format('jMMMM jYYYY'), [startOfMonth]);

    const getPlanNearestDueDate = (plan: InstallmentPlan): Date | null => {
        const upcoming = plan.payments
            .filter(p => !p.isPaid)
            .map(p => new Date(p.dueDate))
            .sort((a, b) => a.getTime() - b.getTime());
        return upcoming[0] || null;
    };

    const getPlanFirstDueDate = (plan: InstallmentPlan): Date | null => {
        const first = [...plan.payments]
            .map(p => new Date(p.dueDate))
            .sort((a, b) => a.getTime() - b.getTime())[0];
        return first || null;
    };

    const instJYear = useMemo(() => startOfMonth.jYear(), [startOfMonth]);
    const instJMonth = useMemo(() => startOfMonth.jMonth() + 1, [startOfMonth]);
    const isCurrentInstMonth = useMemo(() => {
        const now = moment();
        return now.jYear() === instJYear && (now.jMonth() + 1) === instJMonth;
    }, [instJYear, instJMonth]);
    const isInInstMonth = (iso: string) => {
        const d = moment(iso);
        return d.jYear() === instJYear && (d.jMonth() + 1) === instJMonth;
    };
    const getPlanThisMonthAmount = (plan: InstallmentPlan): number => {
        return plan.payments
            .filter(p => isInInstMonth(p.dueDate))
            .reduce((sum, p) => sum + (p.amount || 0) + (p.penalty || 0), 0);
    };

    const applySorting = (list: InstallmentPlan[]): InstallmentPlan[] => {
        if (installmentsSortMode === 'custom') {
            const orderMap = new Map(installmentsCustomOrder.map((id, idx) => [id, idx] as const));
            return [...list].sort((a, b) => (orderMap.get(a.id) ?? 1e9) - (orderMap.get(b.id) ?? 1e9));
        }
        if (installmentsSortMode === 'nearest') {
            return [...list].sort((a, b) => {
                const aDue = getPlanNearestDueDate(a);
                const bDue = getPlanNearestDueDate(b);
                if (!aDue && !bDue) return 0;
                if (!aDue) return 1;
                if (!bDue) return -1;
                const cmp = aDue.getTime() - bDue.getTime();
                if (cmp !== 0) return cmp;
                const aFirst = getPlanFirstDueDate(a) || today;
                const bFirst = getPlanFirstDueDate(b) || today;
                return aFirst.getTime() - bFirst.getTime();
            });
        }
        if (installmentsSortMode === 'highest_month') {
            return [...list].sort((a, b) => {
                const aAmt = getPlanThisMonthAmount(a);
                const bAmt = getPlanThisMonthAmount(b);
                if (bAmt !== aAmt) return bAmt - aAmt;
                const aDue = getPlanNearestDueDate(a) || new Date(8640000000000000);
                const bDue = getPlanNearestDueDate(b) || new Date(8640000000000000);
                return aDue.getTime() - bDue.getTime();
            });
        }
        if (installmentsSortMode === 'earliest_loan') {
            return [...list].sort((a, b) => {
                const aFirst = getPlanFirstDueDate(a) || today;
                const bFirst = getPlanFirstDueDate(b) || today;
                return aFirst.getTime() - bFirst.getTime();
            });
        }
        return list;
    };

    const sortedInstallments = useMemo(() => applySorting(installments), [installments, installmentsSortMode, installmentsCustomOrder]);
    const activePlans = sortedInstallments.filter(plan => plan.payments.some(p => !p.isPaid));
    const completedPlans = sortedInstallments.filter(plan => plan.payments.length > 0 && plan.payments.every(p => p.isPaid));

    if (currentInstallment) {
        const isCompleted = currentInstallment.payments.length > 0 && currentInstallment.payments.every(p => p.isPaid);

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
                        {(() => {
                            const monthPays = plan.payments.filter(p => isInInstMonth(p.dueDate));
                            const monthAmount = monthPays.reduce((s, p) => s + (p.amount || 0) + (p.penalty || 0), 0);
                            const monthPaid = monthPays.length > 0 ? monthPays.every(p => p.isPaid) : false;
                            const earliestMonthDue = monthPays.length > 0 ? monthPays.map(p => p.dueDate).sort((a,b) => new Date(a).getTime() - new Date(b).getTime())[0] : null;
                            const daysUntil = earliestMonthDue ? Math.ceil((new Date(earliestMonthDue).getTime() - new Date().getTime()) / (1000*60*60*24)) : null;
                            return (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-2xl font-extrabold ${monthPaid ? 'text-emerald-400' : 'text-sky-400'}`}>
                                                {monthPays.length > 0 ? formatCurrency(monthAmount) : 'بدون قسط این ماه'}
                                            </p>
                                            {monthPays.length > 0 && <p className="text-xs text-slate-400 mt-0.5">قسط این ماه</p>}
                                        </div>
                                        {monthPays.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                {typeof daysUntil === 'number' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700/50 text-slate-300 ring-1 ring-slate-600">
                                                        {daysUntil > 0 ? `${daysUntil} روز تا سررسید` : daysUntil === 0 ? 'امروز سررسید' : `${Math.abs(daysUntil)} روز گذشته`}
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-xs ring-1 ${monthPaid ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'}`}>
                                                    {monthPaid ? 'پرداخت شده' : 'پرداخت نشده'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <div className="text-slate-400">
                                            <span>مانده وام: </span>
                                            <span className="text-slate-200 font-bold">{formatCurrency(remainingAmount)}</span>
                                        </div>
                                        {earliestMonthDue && <div className="text-xs text-slate-500">سررسید: {formatDate(earliestMonthDue)}</div>}
                                    </div>
                                </div>
                            );
                        })()}
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
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button onClick={() => setInstallmentsSortMode('nearest')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='nearest' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>نزدیک‌ترین اقساط</button>
                    <button onClick={() => setInstallmentsSortMode('highest_month')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='highest_month' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>بیشترین مبلغ ماه</button>
                    <button onClick={() => setInstallmentsSortMode('earliest_loan')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='earliest_loan' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>زودترین وام</button>
                    <button onClick={() => setInstallmentsSortMode('custom')} className={`px-3 py-1 rounded-full text-xs border ${installmentsSortMode==='custom' ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-700/50 text-slate-200 border-slate-600'}`}>شخصی‌سازی</button>
                    {installmentsSortMode === 'custom' && <span className="text-xs text-slate-400">برای تغییر ترتیب کارت‌ها را بکشید و رها کنید</span>}
                </div>

                <div className="mb-3 flex items-center justify-between bg-slate-900/40 p-3 rounded-lg ring-1 ring-slate-800">
                    <button className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs" onClick={() => setInstMonthISO(startOfMonth.clone().subtract(1, 'jMonth').toISOString())}>ماه قبل</button>
                    <div className="text-slate-200 font-bold text-sm">{monthLabel}</div>
                    <button className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs" onClick={() => setInstMonthISO(startOfMonth.clone().add(1, 'jMonth').toISOString())}>ماه بعد</button>
                </div>

                {(() => {
                    const inThisMonth = (p) => isInInstMonth(p.dueDate);
                    const monthlyPayments = installments.flatMap(p => p.payments).filter(inThisMonth);
                    const monthAll = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0) + (p.penalty || 0), 0);
                    const monthPaid = monthlyPayments.filter(p => p.isPaid).reduce((sum, p) => sum + (p.amount || 0) + (p.penalty || 0), 0);
                    const monthRemaining = Math.max(0, monthAll - monthPaid);
                    const progress = monthAll > 0 ? (monthPaid / monthAll) * 100 : 0;
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                            <div className="bg-slate-800/50 rounded-xl p-3 ring-1 ring-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-sm">کل اقساط این ماه</span>
                                    <span className="text-slate-100 font-extrabold">{formatCurrency(monthAll)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-3 ring-1 ring-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-sm">کل پرداختی این ماه</span>
                                    <span className="text-emerald-400 font-extrabold">{formatCurrency(monthPaid)}</span>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-3 ring-1 ring-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-300 text-sm">مانده پرداخت این ماه</span>
                                    <span className="text-rose-400 font-extrabold">{formatCurrency(monthRemaining)}</span>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="mt-1 text-xs text-slate-400 text-center">
                                    <span>پیشرفت پرداخت ماه منتخب: </span>
                                    <span className="text-slate-200 font-semibold">{progress.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {isCurrentInstMonth ? (
                    <>
                        <h3 className="text-2xl font-bold mb-4 text-slate-200">اقساط فعال</h3>
                        {activePlans.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {activePlans.map((plan, idx) => (
                                    <div key={plan.id}
                                         draggable={installmentsSortMode==='custom'}
                                         onDragStart={(e) => { if (installmentsSortMode==='custom') e.dataTransfer.setData('text/plain', String(idx)); }}
                                         onDragOver={(e) => { if (installmentsSortMode==='custom') e.preventDefault(); }}
                                         onDrop={(e) => {
                                             if (installmentsSortMode!=='custom') return;
                                             e.preventDefault();
                                             const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                             if (isNaN(fromIdx)) return;
                                             const currentOrder = [...installmentsCustomOrder];
                                             const activeIds = activePlans.map(p => p.id);
                                             const indices = currentOrder.filter(id => activeIds.includes(id));
                                             const fromId = activePlans[fromIdx]?.id;
                                             const toId = plan.id;
                                             if (!fromId || !toId) return;
                                             const working = [...indices];
                                             const fi = working.indexOf(fromId);
                                             const ti = working.indexOf(toId);
                                             if (fi === -1 || ti === -1) return;
                                             working.splice(ti, 0, working.splice(fi, 1)[0]);
                                             const nonActive = currentOrder.filter(id => !activeIds.includes(id));
                                             const newOrder: string[] = [];
                                             const activeSet = new Set(activeIds);
                                             for (const id of currentOrder) {
                                                 if (activeSet.has(id)) continue;
                                                 newOrder.push(id);
                                             }
                                             const firstActiveIndex = currentOrder.findIndex(id => activeSet.has(id));
                                             const before = currentOrder.slice(0, firstActiveIndex).filter(id => !activeSet.has(id));
                                             const after = currentOrder.slice(firstActiveIndex).filter(id => !activeIds.includes(id));
                                             const reconstructed = [...before, ...working, ...after];
                                             setInstallmentsCustomOrder(reconstructed);
                                         }}>
                                        <PlanCard plan={plan} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 px-6 bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                                <CheckCircleIcon className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-slate-200">شما هیچ قسط فعالی ندارید!</h3>
                                <p className="text-slate-400 mt-2">تمام اقساط شما پرداخت شده‌اند یا قسطی ثبت نکرده‌اید.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="bg-slate-800/40 rounded-xl ring-1 ring-slate-700">
                        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-slate-200 font-bold">لیست اقساط {monthLabel}</h3>
                        </div>
                        <div className="divide-y divide-slate-700">
                            {(() => {
                                const jy = instJYear; const jm = instJMonth;
                                const rows = installments.flatMap(plan => plan.payments.map((p, idx) => ({ plan, p, idx })))
                                    .filter(r => { const d = moment(r.p.dueDate); return d.jYear() === jy && (d.jMonth() + 1) === jm; })
                                    .sort((a,b) => new Date(a.p.dueDate).getTime() - new Date(b.p.dueDate).getTime());
                                if (rows.length === 0) return <div className="p-4 text-slate-500">در این ماه قسطی وجود ندارد.</div>;
                                return rows.map((r) => (
                                    <div key={`${r.plan.id}-${r.p.id}`} className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ring-1 ${r.p.isPaid ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-400 ring-rose-500/30'}`}>{r.p.isPaid ? 'پرداخت شده' : 'پرداخت نشده'}</span>
                                            <div>
                                                <div className="text-slate-100 font-bold text-sm">{r.plan.title}</div>
                                                <div className="text-xs text-slate-400">تاریخ سررسید: {formatDate(r.p.dueDate)}</div>
                                            </div>
                                        </div>
                                        <div className="text-slate-100 font-extrabold">{formatCurrency((r.p.amount || 0) + (r.p.penalty || 0))}</div>
                                    </div>
                                ));
                            })()}
                        </div>
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
