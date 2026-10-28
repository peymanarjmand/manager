import React, { useMemo, useState, useEffect } from 'react';
import moment from 'jalali-moment';
import { InstallmentPayment, InstallmentPlan } from './types';
import { useAccountantStore } from './store';
import { CheckCircleIcon, UncheckedCircleIcon, ArrowRightIcon, EditIcon, DeleteIcon } from '../../components/Icons';
import { formatCurrency, formatDate } from './SmartAccountantShared';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { paymentTotals } from './installmentPayments';
import { InstallmentReceiptModal } from './InstallmentReceiptModal';

const fa = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR');

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
        <div className="mt-2 mb-4 p-4 bg-white/[0.04] rounded-2xl ring-1 ring-white/[0.06]">
            <h4 className="text-base font-medium mb-3 text-slate-200">آمار وام</h4>
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

const getPaymentKey = (planId: string, paymentId: string) => `${planId}::${paymentId}`;

export const InstallmentsView = ({ installments, currentInstallment, setCurrentInstallment, onEditPlan, onDeletePlan, onEditPayment, onTogglePaidStatus }) => {
    const [showPaymentsList, setShowPaymentsList] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [receiptTarget, setReceiptTarget] = useState<{ planId: string; paymentId: string } | null>(null);
    const [selectedPaymentKeys, setSelectedPaymentKeys] = useState<string[]>([]);

    const installmentsSortMode = useAccountantStore(s => s.installmentsSortMode);
    const installmentsCustomOrder = useAccountantStore(s => s.installmentsCustomOrder);
    const { setInstallmentsSortMode, setInstallmentsCustomOrder } = useAccountantStore.getState();

    const today = useMemo(() => new Date(), []);
    const [instMonthISO, setInstMonthISO] = useState<string>(() => moment().startOf('jMonth').toISOString());
    const startOfMonth = useMemo(() => moment(instMonthISO).startOf('jMonth'), [instMonthISO]);
    const endOfMonth = useMemo(() => moment(instMonthISO).endOf('jMonth'), [instMonthISO]);
    const monthLabel = useMemo(() => startOfMonth.clone().locale('fa').format('jMMMM jYYYY'), [startOfMonth]);

    const getPlanNearestDueDate = (plan: InstallmentPlan): Date | null => {
        const upcoming = plan.payments
            .filter(p => !paymentTotals(p).settled)
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

    useEffect(() => {
        setSelectedPaymentKeys([]);
    }, [instMonthISO]);

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
    const activePlans = sortedInstallments.filter(plan => plan.payments.some(p => !paymentTotals(p).settled));
    const completedPlans = sortedInstallments.filter(plan => plan.payments.length > 0 && plan.payments.every(p => paymentTotals(p).settled));

    const monthlyRows = useMemo(() => {
        const jy = instJYear;
        const jm = instJMonth;
        return installments
            .flatMap(plan => plan.payments.map((p, idx) => ({ plan, p, idx })))
            .filter(r => {
                const d = moment(r.p.dueDate);
                return !paymentTotals(r.p).settled && d.jYear() === jy && (d.jMonth() + 1) === jm;
            })
            .sort((a, b) => new Date(a.p.dueDate).getTime() - new Date(b.p.dueDate).getTime());
    }, [installments, instJYear, instJMonth]);

    const monthlyRowMap = useMemo(() => {
        return new Map(monthlyRows.map(r => [getPaymentKey(r.plan.id, r.p.id), r] as const));
    }, [monthlyRows]);

    const selectedSummary = useMemo(() => {
        const rows = selectedPaymentKeys.map(k => monthlyRowMap.get(k)).filter(Boolean) as Array<{ plan: InstallmentPlan; p: InstallmentPayment; idx: number }>;
        const total = rows.reduce((sum, r) => sum + paymentTotals(r.p).remaining, 0);
        return { count: rows.length, total };
    }, [selectedPaymentKeys, monthlyRowMap]);

    const togglePaymentSelection = (key: string) => {
        setSelectedPaymentKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const renderMonthlyPaymentsList = (title: string) => (
        <div className="bg-white/[0.03] rounded-xl ring-1 ring-white/10">
            <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-slate-200 font-bold">{title}</h3>
                {selectedSummary.count > 0 && (
                    <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-900/60 ring-1 ring-white/10 rounded-full px-3 py-1">
                        <span className="text-slate-300">انتخاب شده:</span>
                        <span className="text-slate-100 font-bold">{selectedSummary.count}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-300">مجموع:</span>
                        <span className="text-sky-300 font-extrabold">{formatCurrency(selectedSummary.total)}</span>
                    </div>
                )}
            </div>
            <div className="divide-y divide-slate-700">
                {monthlyRows.length === 0 ? (
                    <div className="p-4 text-slate-500">در این ماه قسطی وجود ندارد.</div>
                ) : (
                    monthlyRows.map((r) => {
                        const key = getPaymentKey(r.plan.id, r.p.id);
                        const isSelected = selectedPaymentKeys.includes(key);
                        const amount = (r.p.amount || 0) + (r.p.penalty || 0);
                        return (
                            <div
                                key={key}
                                className={`w-full text-right p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition ${isSelected ? 'bg-slate-800/70' : 'bg-transparent'}`}
                            >
                                <button type="button" onClick={() => togglePaymentSelection(key)} aria-pressed={isSelected} className="flex items-center gap-3 text-right">
                                    <span className="p-1.5 rounded-full bg-slate-900/60 ring-1 ring-white/10">
                                        {isSelected ? <CheckCircleIcon /> : <UncheckedCircleIcon />}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ring-1 ${paymentTotals(r.p).settled ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' : 'bg-amber-500/10 text-amber-300 ring-amber-500/30'}`}>
                                        {paymentTotals(r.p).settled ? 'پرداخت شده' : paymentTotals(r.p).paid > 0 ? 'بخشی پرداخت شده' : 'پرداخت نشده'}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-slate-100 font-bold text-sm truncate">{r.plan.title}</div>
                                        <div className="text-xs text-slate-400">تاریخ سررسید: {formatDate(r.p.dueDate)}</div>
                                    </div>
                                </button>
                                <div className="text-slate-100 font-extrabold">{formatCurrency(amount)}<p className="text-xs text-rose-300 font-normal">مانده: {formatCurrency(paymentTotals(r.p).remaining)}</p></div>
                                <button type="button" onClick={() => setReceiptTarget({ planId: r.plan.id, paymentId: r.p.id })} className="text-sm text-brand-300 border border-brand-800 rounded-xl px-3 py-2">{paymentTotals(r.p).settled ? 'سوابق پرداخت' : 'پرداخت مرحله‌ای'}</button>
                            </div>
                        );
                    })
                )}
            </div>
            {selectedSummary.count > 0 && (
                <div className="sm:hidden fixed bottom-3 left-3 right-3 z-30">
                    <div className="bg-slate-900/95 backdrop-blur rounded-xl ring-1 ring-white/10 px-4 py-3 flex items-center justify-between">
                        <div className="text-xs text-slate-300">
                            <span>اقساط انتخابی: </span>
                            <span className="text-slate-100 font-bold">{selectedSummary.count}</span>
                        </div>
                        <div className="text-sm text-slate-300">
                            <span>مجموع: </span>
                            <span className="text-sky-300 font-extrabold">{formatCurrency(selectedSummary.total)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const receiptPayment = receiptTarget && installments.find(p => p.id === receiptTarget.planId)?.payments.find(p => p.id === receiptTarget.paymentId);
    const receiptModal = receiptTarget && receiptPayment ? <InstallmentReceiptModal key={receiptPayment.id} planId={receiptTarget.planId} payment={receiptPayment} onClose={() => setReceiptTarget(null)} /> : null;
    if (currentInstallment) {
        const totals = currentInstallment.payments.reduce((sum, p) => {
            const t = paymentTotals(p); return { total: sum.total + t.total, paid: sum.paid + t.paid, remaining: sum.remaining + t.remaining };
        }, { total: 0, paid: 0, remaining: 0 });
        const progress = totals.total ? totals.paid / totals.total * 100 : 0;
        const completed = currentInstallment.payments.length > 0 && currentInstallment.payments.every(p => paymentTotals(p).settled);
        return <div className="space-y-4">
            {receiptModal}
            <button onClick={() => setCurrentInstallment(null)} className="flex items-center gap-2 text-slate-300 hover:text-brand-300 text-sm"><ArrowRightIcon />بازگشت به لیست اقساط</button>
            <div className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 flex items-center gap-4">
                <ProgressRing value={progress} size={84} stroke={8} progressClassName="stroke-brand-500" trackClassName="stroke-white/10">
                    <span className="text-brand-300 font-bold">{fa(Math.round(progress))}٪</span>
                </ProgressRing>
                <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-lg text-white">{currentInstallment.title}</h3>
                    {completed && <p className="text-emerald-300 text-sm">این طرح تکمیل شده است</p>}
                    <p className="text-sm text-emerald-300">پرداخت‌شده: {formatCurrency(totals.paid)}</p>
                    <p className="text-sm text-rose-300">مانده: {formatCurrency(totals.remaining)}</p>
                </div>
            </div>
            <PlanStats plan={currentInstallment} />
            <div className="space-y-3">
                {currentInstallment.payments.map((payment, index) => {
                    const t = paymentTotals(payment);
                    return <article key={payment.id} aria-label={`قسط شماره ${index + 1}`} className={`rounded-2xl border p-4 space-y-3 ${t.settled ? 'border-emerald-900 bg-emerald-950/20' : t.paid > 0 ? 'border-amber-800/60 bg-amber-950/10' : 'border-slate-700 bg-white/[0.03]'}`}>
                        <div className="flex flex-wrap justify-between items-start gap-3">
                            <div><h4 className="font-bold text-slate-100">قسط شماره {fa(index + 1)}</h4><p className="text-xs text-slate-400 mt-1">سررسید: {formatDate(payment.dueDate)}</p></div>
                            <span className={`rounded-full px-2 py-1 text-xs ${t.settled ? 'text-emerald-300 bg-emerald-950' : t.paid > 0 ? 'text-amber-300 bg-amber-950' : 'text-rose-300 bg-rose-950'}`}>{t.settled ? 'تسویه‌شده' : t.paid > 0 ? 'بخشی پرداخت شده' : 'پرداخت نشده'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <p className="text-slate-400">کل قسط<strong className="block mt-1 text-slate-200">{formatCurrency(t.total)}</strong></p>
                            <p className="text-slate-400">پرداخت‌شده<strong className="block mt-1 text-emerald-300">{formatCurrency(t.paid)}</strong></p>
                            <p className="text-slate-400">مانده<strong className="block mt-1 text-rose-300">{formatCurrency(t.remaining)}</strong></p>
                        </div>
                        {payment.penalty > 0 && <p className="text-xs text-rose-300">شامل {formatCurrency(payment.penalty)} جریمه</p>}
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${t.total ? t.paid / t.total * 100 : 0}%` }} /></div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setReceiptTarget({ planId: currentInstallment.id, paymentId: payment.id })} className="rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2 text-sm text-white">{t.settled ? 'سوابق پرداخت' : 'پرداخت مرحله‌ای'}</button>
                            {!t.settled && <button aria-label={`ویرایش قسط ${index + 1}`} onClick={() => onEditPayment({ ...payment, planId: currentInstallment.id })} className="rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-300">ویرایش مبلغ و سررسید</button>}
                        </div>
                    </article>;
                })}
            </div>
        </div>;
    }

    if (installments.length === 0) {
        return <p className="text-slate-500 text-center py-16 bg-slate-800/20 rounded-lg">هنوز برنامه قسطی ثبت نشده است.</p>;
    }
    
    const PlanCard: React.FC<{ plan: any; isCompleted?: boolean }> = ({ plan, isCompleted = false }) => {
        const paidCount = plan.payments.filter(p => paymentTotals(p).settled).length;
        const totalCount = plan.payments.length;
        const remainingAmount = plan.payments.reduce((sum, p) => sum + paymentTotals(p).remaining, 0);
        const planTotal = plan.payments.reduce((sum, p) => sum + paymentTotals(p).total, 0);
        const planProgress = planTotal > 0 ? (planTotal - remainingAmount) / planTotal * 100 : 0;
        const nextPayment = plan.payments.find(p => !paymentTotals(p).settled);
        const lastPaymentDate = isCompleted ? plan.payments.map(p => p.paidDate).filter(Boolean).sort((a,b) => new Date(b).getTime() - new Date(a).getTime())[0] : null;

        return (
            <div
                className={`bg-white/[0.04] rounded-2xl p-4 ring-1 ring-white/[0.06] transition-all flex flex-col cursor-pointer ${isCompleted ? 'hover:ring-emerald-700' : 'hover:ring-brand-500/60 hover:-translate-y-0.5'}`}
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
                            const monthPaid = monthPays.length > 0 ? monthPays.every(p => paymentTotals(p).settled) : false;
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
                        <div className="mt-auto pt-3 border-t border-white/10 text-xs text-slate-400">
                           <div className="flex justify-between items-center mb-1">
                               <span>پیشرفت</span>
                               <span>{fa(Math.round(planProgress))}٪ · {fa(paidCount)} از {fa(totalCount)} قسط تسویه</span>
                           </div>
                           <div className="w-full bg-slate-700 rounded-full h-1.5">
                               <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: `${planProgress}%`}}></div>
                           </div>
                           {nextPayment && <p className="mt-2 text-center">پرداخت بعدی: {formatDate(nextPayment.dueDate)}</p>}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {receiptModal}
            <button onClick={() => setShowCompleted(true)} className="w-full flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-900 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-300"><span>مشاهدهٔ طرح‌های تسویه‌شده</span><span className="rounded-full bg-emerald-900/50 px-3 py-1">{fa(completedPlans.length)} طرح</span></button>
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
                    const monthPaid = monthlyPayments.reduce((sum, p) => sum + paymentTotals(p).paid, 0);
                    const monthRemaining = Math.max(0, monthAll - monthPaid);
                    const progress = monthAll > 0 ? (monthPaid / monthAll) * 100 : 0;
                    if (showCompleted) return <div className="space-y-5">{receiptModal}<button onClick={() => setShowCompleted(false)} className="flex gap-2 text-brand-300"><ArrowRightIcon />بازگشت به اقساط فعال</button><h3 className="text-xl font-bold text-emerald-300">طرح‌های تسویه‌شده</h3><p className="text-sm text-slate-400">{fa(completedPlans.length)} طرح؛ تمام سوابق و پرداخت‌ها محفوظ‌اند.</p><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{completedPlans.map(plan => <PlanCard key={plan.id} plan={plan} isCompleted />)}</div></div>;
    return (
                        <div className="bg-white/[0.04] rounded-2xl p-4 ring-1 ring-white/[0.06] mb-5">
                            <div className="flex items-center gap-4">
                                <ProgressRing value={progress} size={84} stroke={8} progressClassName="stroke-brand-500" trackClassName="stroke-white/10">
                                    <div className="text-base font-medium text-brand-300 nums-tabular">{fa(Math.round(progress))}٪</div>
                                    <div className="text-[10px] text-slate-400">پرداخت‌شده</div>
                                </ProgressRing>
                                <div className="flex-1 space-y-2 text-sm">
                                    <div className="flex items-center justify-between"><span className="text-slate-400">کل این ماه</span><span className="font-medium text-slate-100 nums-tabular">{formatCurrency(monthAll)}</span></div>
                                    <div className="flex items-center justify-between"><span className="text-slate-400">پرداخت‌شده</span><span className="font-medium text-emerald-400 nums-tabular">{formatCurrency(monthPaid)}</span></div>
                                    <div className="flex items-center justify-between"><span className="text-slate-400">مانده</span><span className="font-medium text-rose-400 nums-tabular">{formatCurrency(monthRemaining)}</span></div>
                                </div>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden mt-3">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6d5ef6,#a855f7)' }}></div>
                            </div>
                        </div>
                    );
                })()}
                {isCurrentInstMonth ? (
                    <>
                        <h3 className="text-2xl font-bold mb-4 text-slate-200">اقساط فعال</h3>
                        {activePlans.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                            <div className="text-center py-10 px-6 bg-white/[0.03] rounded-xl ring-1 ring-white/10">
                                <CheckCircleIcon className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-slate-200">شما هیچ قسط فعالی ندارید!</h3>
                                <p className="text-slate-400 mt-2">تمام اقساط شما پرداخت شده‌اند یا قسطی ثبت نکرده‌اید.</p>
                            </div>
                        )}
                        <div className="mt-6">
                            {renderMonthlyPaymentsList(`لیست اقساط ${monthLabel}`)}
                        </div>
                    </>
                ) : (
                    renderMonthlyPaymentsList(`لیست اقساط ${monthLabel}`)
                )}
            </div>
            

        </div>
    );
}
