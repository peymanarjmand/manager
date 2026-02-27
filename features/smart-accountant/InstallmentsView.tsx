import React, { useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { InstallmentPayment, InstallmentPlan } from './types';
import { useAccountantStore } from './store';
import { CheckCircleIcon, UncheckedCircleIcon, ArrowRightIcon, EditIcon, DeleteIcon } from '../../components/Icons';
import { formatCurrency, formatDate } from './SmartAccountantShared';

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
                                             const activeSet = new Set(activeIds);
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
