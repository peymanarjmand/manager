import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { AccountantData } from '../types';
import { useAccountantStore } from '../store';
import { formatCurrency } from '../SmartAccountantShared';
import { ProgressRing } from '../../../components/ui/ProgressRing';
import { Sparkline } from '../../../components/ui/Sparkline';

const fa = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR');

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
    
    const StatCard = ({ title, value, colorClass, spark }: { title: string; value: number; colorClass: string; spark?: boolean }) => (
        <div className="bg-white/[0.04] rounded-2xl p-3 ring-1 ring-white/[0.06] overflow-hidden">
            <h3 className="text-slate-400 text-[11px] leading-tight">{title}</h3>
            <p className={`text-[15px] font-medium mt-1.5 nums-tabular ${colorClass}`}>{formatCurrency(value)}</p>
            {spark && (
                <div className={`mt-1 -mb-1 opacity-35 ${colorClass}`}>
                    <Sparkline data={[10, 13, 9, 14, 11, 15, 12]} height={20} />
                </div>
            )}
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

            <div className="bg-white/[0.04] rounded-2xl p-4 ring-1 ring-white/[0.06] space-y-3">
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
                    <div className="grid grid-cols-2 gap-2.5 text-sm">
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-white/10">ابتدای ماه: <span className="font-bold text-slate-100">{formatCurrency(openingAmount)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-white/10">ورودی‌ها: <span className="font-bold text-emerald-400">{formatCurrency(inflowTotal)}</span></div>
                        <div className="bg-slate-900/40 rounded-lg p-3 ring-1 ring-white/10">خروجی‌ها: <span className="font-bold text-rose-400">{formatCurrency(outflowTotal)}</span></div>
                        <div className="bg-slate-900/60 rounded-lg p-3 ring-1 ring-white/10">مانده ماه: <span className="font-extrabold text-sky-400">{formatCurrency(monthEndBalance)}</span></div>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
                <StatCard title="ارزش خالص دارایی‌ها" value={netWorth} colorClass="text-sky-400" spark />
                <StatCard title={`درآمد ${selectedMonthLabel}`} value={incomeOfMonth} colorClass="text-emerald-400" spark />
                <StatCard title={`هزینه ${selectedMonthLabel}`} value={expensesOfMonth} colorClass="text-rose-400" spark />
            </div>

            {monthlyInstallments.hasInstallments && (
                <div className="bg-white/[0.04] rounded-2xl p-4 ring-1 ring-white/[0.06] space-y-4">
                    <h3 className="text-slate-200 font-medium">خلاصه اقساط {selectedMonthLabel}</h3>
                    <div className="flex items-center gap-4">
                        <ProgressRing value={monthlyInstallments.progress} size={84} stroke={8} progressClassName="stroke-brand-500" trackClassName="stroke-white/10">
                            <div className="text-base font-medium text-brand-300 nums-tabular">{fa(Math.round(monthlyInstallments.progress))}٪</div>
                            <div className="text-[10px] text-slate-400">پرداخت‌شده</div>
                        </ProgressRing>
                        <div className="flex-1 space-y-2 text-sm">
                            <div className="flex items-center justify-between"><span className="text-slate-400">کل این ماه</span><span className="font-medium text-slate-100 nums-tabular">{formatCurrency(monthlyInstallments.totalAmount)}</span></div>
                            <div className="flex items-center justify-between"><span className="text-slate-400">پرداخت‌شده</span><span className="font-medium text-emerald-400 nums-tabular">{formatCurrency(monthlyInstallments.paidAmount)}</span></div>
                            <div className="flex items-center justify-between"><span className="text-slate-400">مانده</span><span className="font-medium text-rose-400 nums-tabular">{formatCurrency(monthlyInstallments.unpaidAmount)}</span></div>
                        </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${monthlyInstallments.progress}%`, background: 'linear-gradient(90deg,#6d5ef6,#a855f7)' }}></div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-slate-400 text-xs">ماه قبل:</span>
                        <button className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-200 text-xs nums-tabular" onClick={() => setSelectedMonthISO(prevInstallments.iso)} title="مشاهده ماه قبل">{prevInstallments.label} • {formatCurrency(prevInstallments.total)}</button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-slate-400 text-xs">ماه‌های آینده:</span>
                        {nextInstallments.map((m) => (
                            <button key={m.iso} className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-200 text-xs nums-tabular" onClick={() => setSelectedMonthISO(m.iso)} title={`اقساط ${m.label}`}>{m.label} • {formatCurrency(m.total)}</button>
                        ))}
                    </div>
                </div>
            )}
             <div className="grid grid-cols-3 gap-2.5">
                 <StatCard title="مجموع طلب شما از دیگران" value={totalDebt} colorClass="text-emerald-400" />
                 <StatCard title="مجموع بدهی شما به دیگران" value={totalCredit} colorClass="text-rose-400" />
                 <StatCard title={`چک‌های صادره ${selectedMonthLabel}`} value={monthlyIssuedChecks} colorClass="text-amber-400" />
             </div>
        </div>
    )
};
