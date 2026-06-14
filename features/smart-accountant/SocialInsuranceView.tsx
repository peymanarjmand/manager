import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { ShieldCheck, Award, CalendarDays, Wallet, TrendingUp, Coins, Eye, Pencil, Trash2, CheckCheck, Plus, StickyNote, Clock } from 'lucide-react';
import { useAccountantStore } from './store';
import { ConfirmDialog } from './ConfirmDialog';
import { isImageRef, saveImageDataURL, getObjectURLByRef } from '../../lib/idb-images';
import { formatCurrency, JalaliDatePicker, ReceiptPreview } from './SmartAccountantShared';
import { newId } from '../../lib/id';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Sparkline } from '../../components/ui/Sparkline';
import { SocialInsurancePayment } from './types';

// --- helpers (module scope; pure) ---
const MONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const MONTHS_SHORT = ['فرو', 'ارد', 'خرد', 'تیر', 'مرد', 'شهر', 'مهر', 'آبا', 'آذر', 'دی', 'بهم', 'اسف'];

/** fa-IR grouped digits (e.g. 14091424 -> ۱۴٬۰۹۱٬۴۲۴) */
const fa = (n: number) => (n || 0).toLocaleString('fa-IR');
/** convert ascii digits in any string to Persian (keeps separators like '.') */
const faNum = (s: string | number) => String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
/** compact money label for tight chart labels: ۱.۷م / ۴۵۹هزار */
const compactMoney = (n: number) => {
    if (!n) return faNum(0);
    if (n >= 1_000_000) return `${faNum((n / 1_000_000).toFixed(1))}م`;
    if (n >= 1000) return `${faNum(Math.round(n / 1000))}هزار`;
    return faNum(n);
};
/** days in a Jalali month (1-6 -> 31, 7-11 -> 30, 12 -> 29/30) */
const daysInJMonth = (y: number, m: number) => {
    if (m >= 1 && m <= 6) return 31;
    if (m >= 7 && m <= 11) return 30;
    const isLeap = (moment as any).jIsLeapYear ? (moment as any).jIsLeapYear(y) : moment.jDaysInMonth(y, 11) === 30;
    return isLeap ? 30 : 29;
};
type CoverageStatus = 'full' | 'partial' | 'stub' | 'none';
const statusOf = (rec?: SocialInsurancePayment): CoverageStatus => {
    if (!rec) return 'none';
    if ((rec.daysCovered || 0) === 0) return 'stub';
    return rec.daysCovered >= daysInJMonth(rec.year, rec.month) ? 'full' : 'partial';
};

export const SocialInsuranceView = () => {
    const socialInsurance = useAccountantStore(s => s.socialInsurance);
    const { saveSocialInsurance, deleteSocialInsurance, settleSocialInsurance, settleSocialInsuranceMonth } = useAccountantStore.getState();
    const [previewRef, setPreviewRef] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message: string; confirmText?: string; cancelText?: string; tone?: 'warning' | 'danger' | 'success'; onConfirm: () => void } | null>(null);

    useEffect(() => {
        const handler = () => { setEditing(null); setModalOpen(true); };
        window.addEventListener('open-social-insurance-modal', handler);
        return () => window.removeEventListener('open-social-insurance-modal', handler);
    }, []);

    // index records by year-month for O(1) lookup
    const byKey = useMemo(() => {
        const m = new Map<string, SocialInsurancePayment>();
        socialInsurance.forEach(p => m.set(`${p.year}-${p.month}`, p));
        return m;
    }, [socialInsurance]);
    const findRec = (y: number, m: number) => byKey.get(`${y}-${m}`);

    const years = useMemo(() => Array.from(new Set(socialInsurance.map(p => p.year))).sort((a, b) => b - a), [socialInsurance]);
    const jNow = moment().jYear();
    const activeYear = selectedYear ?? years[0] ?? jNow;

    // --- aggregates ---
    const totalDays = useMemo(() => socialInsurance.reduce((s, p) => s + (p.daysCovered || 0), 0), [socialInsurance]);
    // SSO convention: 30-day month, 360-day year
    const seniority = useMemo(() => {
        const rem = totalDays % 360;
        return { years: Math.floor(totalDays / 360), months: Math.floor(rem / 30), days: rem % 30 };
    }, [totalDays]);
    const remInYear = totalDays % 360;
    const pctToYear = (remInYear / 360) * 100;
    const daysToYear = remInYear === 0 ? 0 : 360 - remInYear;

    const activeChrono = useMemo(
        () => socialInsurance.filter(p => (p.daysCovered || 0) > 0).sort((a, b) => (a.year - b.year) || (a.month - b.month)),
        [socialInsurance]
    );
    const totalPaid = useMemo(() => socialInsurance.reduce((s, p) => s + (p.amount || 0), 0), [socialInsurance]);
    const activeMonths = activeChrono.length;
    const avgPremium = activeMonths ? Math.round(totalPaid / activeMonths) : 0;
    const amountSeries = useMemo(() => activeChrono.map(p => p.amount), [activeChrono]);
    const maxAmt = useMemo(() => activeChrono.reduce((m, p) => Math.max(m, p.amount), 0), [activeChrono]);
    const latestSalary = useMemo(() => {
        const w = socialInsurance.filter(p => p.registeredSalary && p.registeredSalary > 0).sort((a, b) => (b.year - a.year) || (b.month - a.month));
        return w[0]?.registeredSalary || 0;
    }, [socialInsurance]);
    const thisYearPaid = useMemo(() => socialInsurance.filter(p => p.year === jNow).reduce((s, p) => s + (p.amount || 0), 0), [socialInsurance, jNow]);
    const thisYearDays = useMemo(() => socialInsurance.filter(p => p.year === jNow).reduce((s, p) => s + (p.daysCovered || 0), 0), [socialInsurance, jNow]);

    const seniorityText = seniority.years > 0
        ? `${faNum(seniority.years)} سال و ${faNum(seniority.months)} ماه`
        : seniority.months > 0
            ? `${faNum(seniority.months)} ماه و ${faNum(seniority.days)} روز`
            : `${faNum(seniority.days)} روز`;

    const openNewFor = (year: number, month: number) => {
        setEditing({ id: newId(), year, month, daysCovered: 0, amount: 0, payDate: new Date().toISOString() });
        setModalOpen(true);
    };

    const cellClass = (st: CoverageStatus) => {
        if (st === 'full') return 'bg-brand-500 text-white ring-1 ring-brand-300/40';
        if (st === 'partial') return 'bg-amber-500/85 text-white ring-1 ring-amber-300/40';
        if (st === 'stub') return 'bg-white/[0.06] text-slate-500 ring-1 ring-white/10';
        return 'bg-transparent text-slate-600 ring-1 ring-dashed ring-white/10';
    };

    const StatusBadge = ({ st }: { st: CoverageStatus }) => {
        if (st === 'full') return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">پوشش کامل</span>;
        if (st === 'partial') return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30">پوشش جزئی</span>;
        if (st === 'stub') return <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-white/10">بدون پوشش</span>;
        return <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-white/10">ثبت‌نشده</span>;
    };

    return (
        <div className="space-y-5">
            {/* ===== Seniority hero ===== */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-5 ring-1 ring-white/10 shadow-lg shadow-brand-900/30">
                <div className="pointer-events-none absolute -top-12 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-14 -right-8 h-44 w-44 rounded-full bg-brand-300/25 blur-2xl" />
                <div className="relative flex items-center gap-4 sm:gap-6">
                    <ProgressRing value={pctToYear} size={116} stroke={9} trackClassName="stroke-white/20" progressClassName="stroke-white">
                        <div className="flex flex-col items-center leading-none">
                            <ShieldCheck className="h-5 w-5 text-white/90" />
                            <div className="mt-1 text-lg font-extrabold text-white nums-tabular">{faNum(Math.round(pctToYear))}٪</div>
                            <div className="mt-0.5 text-[10px] text-white/70">پیشرفت سال</div>
                        </div>
                    </ProgressRing>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm text-white/80">
                            <Award className="h-4 w-4" /> سابقهٔ بیمهٔ شما
                        </div>
                        <div className="mt-1 text-3xl font-extrabold leading-tight text-white">{seniorityText}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                                <CalendarDays className="h-3.5 w-3.5" /> {fa(totalDays)} روز پوشش
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                                <Clock className="h-3.5 w-3.5" /> {fa(daysToYear)} روز تا تکمیل سال
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== KPI strip ===== */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10">
                    <div className="flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400"><Wallet className="h-4 w-4" /></span>
                        {amountSeries.length >= 2 && <span className="text-emerald-400/70 w-14"><Sparkline data={amountSeries} height={24} /></span>}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">مجموع پرداختی</div>
                    <div className="text-base font-extrabold text-slate-50 nums-tabular">{fa(totalPaid)}</div>
                    <div className="text-[10px] text-slate-500">تومان</div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300"><CalendarDays className="h-4 w-4" /></span>
                    <div className="mt-2 text-xs text-slate-400">ماه‌های دارای پوشش</div>
                    <div className="text-base font-extrabold text-slate-50 nums-tabular">{fa(activeMonths)} ماه</div>
                    <div className="text-[10px] text-slate-500">از {fa(socialInsurance.length)} ماه ثبت‌شده</div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300"><TrendingUp className="h-4 w-4" /></span>
                    <div className="mt-2 text-xs text-slate-400">میانگین حق بیمه</div>
                    <div className="text-base font-extrabold text-slate-50 nums-tabular">{fa(avgPremium)}</div>
                    <div className="text-[10px] text-slate-500">تومان در ماه</div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300"><Coins className="h-4 w-4" /></span>
                    <div className="mt-2 text-xs text-slate-400">حقوق مبنای فعلی</div>
                    <div className="text-base font-extrabold text-slate-50 nums-tabular">{fa(latestSalary)}</div>
                    <div className="text-[10px] text-slate-500">تومان</div>
                </div>
            </div>

            {/* this-year strip */}
            <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5 text-xs ring-1 ring-white/10">
                <span className="font-bold text-slate-200">عملکرد سال {faNum(jNow)}</span>
                <span className="text-slate-400">
                    <span className="font-bold text-emerald-400 nums-tabular">{formatCurrency(thisYearPaid)}</span>
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="font-bold text-amber-400 nums-tabular">{fa(thisYearDays)} روز</span>
                </span>
            </div>

            {/* ===== Coverage heatmap ===== */}
            {years.length > 0 && (
                <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100"><CalendarDays className="h-4 w-4 text-brand-300" /> نقشهٔ پوشش بیمه</h3>
                        <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-brand-500" />کامل</span>
                            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-amber-500/85" />جزئی</span>
                            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-white/[0.12]" />بدون پوشش</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        {years.map(y => (
                            <div key={y} className="flex items-center gap-2">
                                <div className="w-9 shrink-0 text-xs font-bold text-slate-300 nums-tabular">{faNum(y)}</div>
                                <div className="grid flex-1 grid-cols-12 gap-1">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                                        const rec = findRec(y, m);
                                        const st = statusOf(rec);
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => setSelectedYear(y)}
                                                title={`${MONTHS_FA[m - 1]} ${faNum(y)}${rec ? ` · ${faNum(rec.daysCovered)} روز` : ' · ثبت‌نشده'}`}
                                                className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-bold transition hover:scale-105 ${cellClass(st)}`}
                                            >
                                                {faNum(m)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== Premium trend ===== */}
            {activeChrono.length >= 2 && (
                <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-100"><TrendingUp className="h-4 w-4 text-brand-300" /> روند حق بیمهٔ پرداختی</h3>
                    <div className="flex items-stretch gap-1.5">
                        {activeChrono.map(p => {
                            const hPct = maxAmt > 0 ? Math.max(6, Math.round((p.amount / maxAmt) * 100)) : 6;
                            const partial = statusOf(p) === 'partial';
                            return (
                                <div key={`${p.year}-${p.month}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                                    <span className="nums-tabular text-[8px] font-semibold leading-none text-slate-400">{compactMoney(p.amount)}</span>
                                    <div className="flex w-full items-end justify-center" style={{ height: 92 }}>
                                        <div
                                            className={`w-full max-w-[26px] rounded-t-md transition-all ${partial ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-gradient-to-t from-brand-600 to-brand-400'}`}
                                            style={{ height: `${hPct}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] leading-none text-slate-300">{MONTHS_SHORT[p.month - 1]}</span>
                                    <span className="nums-tabular text-[8px] leading-none text-slate-500">{faNum(String(p.year).slice(-2))}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== Per-year management ===== */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="shrink-0 text-sm font-bold text-slate-200">سوابق:</span>
                    {years.map(y => (
                        <button
                            key={y}
                            onClick={() => setSelectedYear(y)}
                            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition ${activeYear === y ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-md shadow-brand-900/30' : 'bg-white/[0.05] text-slate-300 ring-1 ring-white/10 hover:bg-white/[0.08]'}`}
                        >
                            {faNum(y)}
                        </button>
                    ))}
                    {years.length === 0 && <span className="text-sm text-slate-400">هنوز سابقه‌ای ثبت نشده است.</span>}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const rec = findRec(activeYear, m);
                        const st = statusOf(rec);
                        const expected = daysInJMonth(activeYear, m);
                        const salary = rec?.registeredSalary || 0;
                        const payPercent = salary > 0 && rec ? Math.round((rec.amount / salary) * 100) : 0;
                        const hasNote = rec?.note && rec.note !== 'settled_stub';
                        return (
                            <div key={m} className={`rounded-2xl p-4 ring-1 transition ${rec && st !== 'stub' ? 'bg-white/[0.05] ring-white/10' : 'bg-white/[0.02] ring-white/[0.06]'}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-100">{MONTHS_FA[m - 1]}</span>
                                        <StatusBadge st={st} />
                                    </div>
                                    {rec?.receiptRef && (
                                        <button onClick={() => setPreviewRef(rec.receiptRef!)} className="text-slate-400 transition hover:text-brand-300" title="مشاهده فیش">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {rec ? (
                                    <>
                                        <div className="mt-2 flex items-end justify-between">
                                            <div>
                                                <div className="text-lg font-extrabold text-brand-200 nums-tabular">{fa(rec.amount)} <span className="text-xs font-normal text-slate-400">تومان</span></div>
                                                <div className="mt-0.5 text-xs text-slate-400 nums-tabular">پوشش: {faNum(rec.daysCovered)} از {faNum(expected)} روز</div>
                                            </div>
                                            {salary > 0 && (
                                                <div className="text-right">
                                                    <div className="text-[10px] text-slate-500">نسبت به حقوق مبنا</div>
                                                    <div className="text-sm font-bold text-sky-300 nums-tabular">{faNum(payPercent)}٪</div>
                                                </div>
                                            )}
                                        </div>

                                        {salary > 0 && (
                                            <div className="mt-1 text-[11px] text-slate-500 nums-tabular">حقوق مبنا: {fa(salary)} تومان</div>
                                        )}
                                        <div className="mt-1 text-[11px] text-slate-500 nums-tabular">پرداخت: {moment(rec.payDate).locale('fa').format('jD jMMMM jYYYY')}</div>

                                        {hasNote && (
                                            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-200/90 ring-1 ring-amber-500/20">
                                                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                <span>{rec.note}</span>
                                            </div>
                                        )}

                                        <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-2.5">
                                            {!rec.isSettled && (
                                                <>
                                                    <button onClick={() => { setEditing(rec); setModalOpen(true); }} className="flex items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 ring-1 ring-white/10 transition hover:text-brand-300">
                                                        <Pencil className="h-3.5 w-3.5" /> ویرایش
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmState({ open: true, title: 'حذف رکورد بیمه', message: 'این رکورد پرداخت بیمه به طور کامل حذف می‌شود و قابل بازگشت نیست. مطمئن هستید؟', confirmText: 'بله، حذف شود', cancelText: 'انصراف', tone: 'danger', onConfirm: () => deleteSocialInsurance(rec.id) })}
                                                        className="flex items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 ring-1 ring-white/10 transition hover:text-rose-400"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" /> حذف
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmState({ open: true, title: 'تسویه نهایی', message: 'تسویه این ماه غیرقابل بازگشت است. تایید می‌کنید؟', confirmText: '✓✓ تسویه نهایی', tone: 'success', onConfirm: () => settleSocialInsurance(rec.id) })}
                                                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-500"
                                                        title="تسویه (غیرقابل بازگشت)"
                                                    >
                                                        <CheckCheck className="h-3.5 w-3.5" /> تسویه
                                                    </button>
                                                </>
                                            )}
                                            {rec.isSettled && (
                                                <span className="flex items-center gap-1 rounded-lg bg-emerald-700/80 px-2.5 py-1 text-xs font-bold text-white">
                                                    <CheckCheck className="h-3.5 w-3.5" /> تسویه‌شده
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">پرداختی ثبت نشده</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openNewFor(activeYear, m)} className="flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand-400">
                                                <Plus className="h-3.5 w-3.5" /> ثبت
                                            </button>
                                            <button
                                                onClick={() => setConfirmState({ open: true, title: 'تسویه بدون ثبت پرداخت', message: 'این ماه را بدون ثبت پرداخت تسویه می‌کنید. این اقدام غیرقابل بازگشت است. تایید می‌کنید؟', confirmText: '✓✓ تسویه', tone: 'success', onConfirm: () => settleSocialInsuranceMonth(activeYear, m) })}
                                                className="flex items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300 ring-1 ring-white/10 transition hover:text-emerald-400"
                                                title="تسویه بدون ثبت"
                                            >
                                                <CheckCheck className="h-3.5 w-3.5" /> تسویه
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <SocialInsuranceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={(payload) => { saveSocialInsurance(payload); setModalOpen(false); }} payment={editing} />
            <ReceiptPreview refOrUrl={previewRef} onClose={() => setPreviewRef(null)} />
            <ConfirmDialog open={!!confirmState?.open} title={confirmState?.title || 'تایید عملیات'} message={confirmState?.message || ''} confirmText={confirmState?.confirmText || 'تایید'} cancelText={confirmState?.cancelText || 'لغو'} tone={confirmState?.tone || 'warning'} onConfirm={() => { try { confirmState?.onConfirm?.(); } finally { } }} onClose={() => setConfirmState(null)} />
        </div>
    );
};

const SocialInsuranceModal = ({ isOpen, onClose, onSave, payment }: { isOpen: boolean; onClose: () => void; onSave: (p: any) => void; payment: any | null; }) => {
    const [form, setForm] = useState<any>(() => payment || ({ id: newId(), year: moment().jYear(), month: moment().jMonth() + 1, daysCovered: moment.jDaysInMonth(moment().jYear(), moment().jMonth()), amount: 0, payDate: new Date().toISOString() }));
    const [receiptURL, setReceiptURL] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);

    const computeDaysCovered = (year: number, month: number) => {
        if (month >= 1 && month <= 6) return 31;
        if (month >= 7 && month <= 11) return 30;
        const isLeap = (moment as any).jIsLeapYear ? (moment as any).jIsLeapYear(year) : moment.jDaysInMonth(year, 11) === 30;
        return isLeap ? 30 : 29;
    };

    useEffect(() => {
        if (payment) {
            setForm(payment);
        } else {
            setForm({ id: newId(), year: moment().jYear(), month: moment().jMonth() + 1, daysCovered: moment.jDaysInMonth(moment().jYear(), moment().jMonth()), amount: 0, payDate: new Date().toISOString() });
        }
        (async () => {
            if (payment?.receiptRef && isImageRef(payment.receiptRef)) {
                const url = await getObjectURLByRef(payment.receiptRef);
                setReceiptURL(url);
            } else {
                setReceiptURL(null);
            }
        })();
    }, [payment, isOpen]);

    useEffect(() => {
        const autoDays = computeDaysCovered(form.year, form.month);
        setForm((p: any) => (p.daysCovered === autoDays ? p : { ...p, daysCovered: autoDays }));
    }, [form.year, form.month]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const existing = useAccountantStore.getState().socialInsurance;
        const duplicate = existing.find(x => x.year === form.year && x.month === form.month && x.id !== form.id);
        if (duplicate) {
            alert('برای این سال/ماه قبلا پرداخت ثبت شده است.');
            return;
        }
        const maxDays = computeDaysCovered(form.year, form.month);
        const days = Math.max(0, Math.min(Number(form.daysCovered) || 0, maxDays));
        onSave({ ...form, amount: Number(form.amount) || 0, daysCovered: days });
    };

    const maxDaysForCurrent = computeDaysCovered(form.year, form.month);
    const isLeapEsfand = form.month === 12 && maxDaysForCurrent === 30;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl ring-1 ring-white/10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center p-4 border-b border-white/10 sticky top-0 bg-slate-800 z-10">
                        <h3 className="text-xl font-bold text-slate-100">{payment ? 'ویرایش پرداخت بیمه' : 'ثبت پرداخت بیمه'}</h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition">بستن</button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">سال</label>
                                <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.year} onChange={e => setForm(p => ({...p, year: Number((e.target as HTMLInputElement).value)}))} required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">ماه</label>
                                <select className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.month} onChange={e => setForm(p => ({...p, month: Number((e.target as HTMLSelectElement).value)}))}>
                                    {monthNames.map((name, idx) => <option key={idx+1} value={idx+1}>{name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">حقوق ثبت‌شده (اختیاری)</label>
                            <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.registeredSalary || ''} onChange={e => setForm(p => ({...p, registeredSalary: Number((e.target as HTMLInputElement).value) || 0 }))} placeholder="مثلا 15,000,000" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">روزهای پوشش (قابل ویرایش)</label>
                                <input type="number" min={0} max={maxDaysForCurrent} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.daysCovered} onChange={e => setForm(p => ({...p, daysCovered: Number((e.target as HTMLInputElement).value)}))} />
                                <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                                    <span>حداکثر این ماه: {maxDaysForCurrent} روز</span>
                                    {isLeapEsfand && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">سال کبیسه</span>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">مبلغ (تومان)</label>
                                <input type="number" className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.amount} onChange={e => setForm(p => ({...p, amount: Number((e.target as HTMLInputElement).value)}))} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <JalaliDatePicker label="تاریخ پرداخت" id="siPayDate" value={form.payDate} onChange={(iso) => setForm(p => ({ ...p, payDate: iso }))} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">یادداشت (اختیاری)</label>
                                <input className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none" value={form.note || ''} onChange={e => setForm(p => ({...p, note: (e.target as HTMLInputElement).value}))} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-300 mb-1">تصویر فاکتور (اختیاری)</label>
                            <div className="mt-1 flex items-center gap-3">
                                <div className="relative h-20 w-20 rounded-md bg-slate-700/50 overflow-hidden flex items-center justify-center">
                                    {receiptURL ? <img src={receiptURL} className="h-full w-full object-cover"/> : <span className="text-slate-500 text-xs">بدون تصویر</span>}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="h-4 w-4 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                        try {
                                            setIsUploading(true);
                                            const dataUrl = String(reader.result);
                                            const ref = await saveImageDataURL(dataUrl);
                                            setForm(p => ({ ...p, receiptRef: ref }));
                                            const url = await getObjectURLByRef(ref);
                                            setReceiptURL(url);
                                        } catch (err) {
                                            console.error('Receipt upload failed', err);
                                        } finally {
                                            setIsUploading(false);
                                        }
                                    };
                                    reader.readAsDataURL(f);
                                }} className="text-sm"/>
                            </div>
                            {receiptURL && (
                                <div className="mt-2 text-right">
                                    <a href={receiptURL} target="_blank" rel="noreferrer" className="text-sky-400 text-sm">دانلود فیش</a>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-white/[0.04] border-t border-white/10 flex justify-end space-x-3 space-x-reverse sticky bottom-0 z-10">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition">لغو</button>
                        <button type="submit" disabled={isUploading} className={`py-2 px-4 rounded-md text-sm font-bold transition ${isUploading ? 'bg-slate-600 text-slate-300 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>ذخیره</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
