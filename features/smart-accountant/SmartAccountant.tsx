import React, { useState, useEffect, useMemo, useCallback } from 'react';
import moment from 'jalali-moment';
import { Transaction, Person, LedgerEntry, InstallmentPlan, InstallmentPayment, CheckStatus } from './types';
import { SummaryIcon, TransactionsIcon, PeopleIcon, InstallmentsIcon, ChecksIcon, BackIcon, PlusIcon, WalletIcon } from '../../components/Icons';
import DarfakViewBase from './DarfakView';
import { useAccountantStore } from './store';
import { TransactionVoucherModal } from './TransactionVoucherModal';
import { ConfirmDialog } from './ConfirmDialog';
import { getLedgerUnitConfig } from './SmartAccountantShared';
import { SummaryView as SummaryViewBase, TransactionsView as TransactionsViewBase, PeopleView as PeopleViewBase, ChecksView as ChecksViewBase, LedgerEntrySummaryModal } from './SmartAccountantViews';
import { AccountantFormModal } from './AccountantFormModal';
import { InstallmentsView as InstallmentsViewBase } from './InstallmentsView';
import { SocialInsuranceView as SocialInsuranceViewBase } from './SocialInsuranceView';
import { newId } from '../../lib/id';

// CONFIG
type AccountantTab = 'summary' | 'transactions' | 'people' | 'installments' | 'checks' | 'darfak' | 'social_insurance';
type ModalConfig = { isOpen: boolean; type?: 'transaction' | 'asset' | 'person' | 'ledger' | 'installmentPlan' | 'installmentPayment' | 'check'; payload?: any };

// Memoize the tab views. Unrelated container state (opening a modal, the confirm
// dialog, viewing a voucher/ledger) re-renders this container; with the stable
// props below, the active heavy view no longer re-renders along with it.
// SocialInsurance and Darfak take no props, so memo fully isolates them from
// container renders (they keep their own store subscriptions).
const SummaryView = React.memo(SummaryViewBase);
const TransactionsView = React.memo(TransactionsViewBase);
const PeopleView = React.memo(PeopleViewBase);
const ChecksView = React.memo(ChecksViewBase);
const InstallmentsView = React.memo(InstallmentsViewBase);
const SocialInsuranceView = React.memo(SocialInsuranceViewBase);
const DarfakView = React.memo(DarfakViewBase);

// Main Component
export const SmartAccountant = ({ onNavigateBack }: { onNavigateBack: () => void; }): React.ReactNode => {
    const [activeTab, setActiveTab] = useState<AccountantTab>('summary');
    const [modal, setModal] = useState<ModalConfig>({ isOpen: false });
    const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
    const [viewLedgerEntry, setViewLedgerEntry] = useState<LedgerEntry | null>(null);
    const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
    const [currentInstallment, setCurrentInstallment] = useState<InstallmentPlan | null>(null);
    const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message: string; confirmText?: string; cancelText?: string; tone?: 'warning' | 'danger' | 'success'; onConfirm: () => void } | null>(null);

    // Subscribe only to the financial slices this container actually renders (plus
    // tabsOrder for the tab bar). Changes to UI-pref-only slices that child views
    // own their own subscriptions for (customCategories, installments sort order,
    // peopleOrder, socialInsurance, darfak) no longer re-render the whole tree.
    const transactions = useAccountantStore(s => s.transactions);
    const assets = useAccountantStore(s => s.assets);
    const people = useAccountantStore(s => s.people);
    const ledger = useAccountantStore(s => s.ledger);
    const installments = useAccountantStore(s => s.installments);
    const checks = useAccountantStore(s => s.checks);
    const funds = useAccountantStore(s => s.funds);
    const tabsOrder = useAccountantStore(s => s.tabsOrder);
    const data = useMemo(
        () => ({ transactions, assets, people, ledger, installments, checks, funds }),
        [transactions, assets, people, ledger, installments, checks, funds]
    );
    const viewLedgerPerson = useMemo(() => {
        if (!viewLedgerEntry) return null;
        return data.people.find(p => p.id === viewLedgerEntry.personId) || null;
    }, [viewLedgerEntry, data.people]);

    useEffect(() => {
        const { loadInstallments, loadTransactions, loadAssets, loadPeopleAndLedger, loadChecks, loadSocialInsurance } = useAccountantStore.getState();
        Promise.all([
            loadTransactions(),
            loadAssets(),
            loadPeopleAndLedger(),
            loadChecks(),
            loadSocialInsurance(),
            loadInstallments(),
            (useAccountantStore.getState() as any).loadFunds?.(),
        ]).catch(() => {});
    }, []);

    useEffect(() => {
        if(activeTab !== 'people') setCurrentPerson(null);
        if(activeTab !== 'installments') setCurrentInstallment(null);
    }, [activeTab]);
    
    useEffect(() => {
        if (currentInstallment) {
            const updatedPlan = data.installments.find(p => p.id === currentInstallment.id);
            if (updatedPlan && JSON.stringify(updatedPlan) !== JSON.stringify(currentInstallment)) {
                setCurrentInstallment(updatedPlan);
            } else if (!updatedPlan) {
                setCurrentInstallment(null);
            }
        }
    }, [data.installments, currentInstallment]);

    const openModal = useCallback((type: ModalConfig['type'], payload = null) => setModal({ isOpen: true, type, payload }), []);
    const closeModal = useCallback(() => setModal({ isOpen: false }), []);

    const handleSave = (itemType: string, itemData: any) => {
        const actions = useAccountantStore.getState();
        const id = itemData.id || newId();
    
        switch (itemType) {
            case 'transaction':
                actions.saveTransaction({ ...itemData, id, amount: parseFloat(itemData.amount) || 0 });
                break;
            case 'person':
                actions.savePerson({ ...itemData, id });
                break;
            case 'ledger': {
                const unitCfg = getLedgerUnitConfig(itemData.unit || 'toman');
                const parsedAmount = parseFloat(String(itemData.amount));
                const safeAmount = isNaN(parsedAmount) ? 0 : Number(parsedAmount.toFixed(unitCfg.maxDecimals));
                actions.saveLedgerEntry({
                    ...itemData,
                    id,
                    amount: safeAmount,
                    unit: unitCfg.id,
                });
                break;
            }
            case 'installmentPlan': {
                const { title, loanAmount, paymentAmount, installmentsCount, firstPaymentDate, id: planId } = itemData;
                if (planId) { 
                    actions.updateInstallmentPlan({ id: planId, title, loanAmount: parseFloat(loanAmount) || 0 });
                } else { 
                    const newPlanId = newId();
                    const payments: InstallmentPayment[] = Array.from({ length: parseInt(installmentsCount, 10) || 0 }, (_, i) => ({
                        id: `${newPlanId}-${i}`,
                        dueDate: moment(firstPaymentDate).add(i, 'jMonth').toISOString(),
                        amount: parseFloat(paymentAmount) || 0,
                        isPaid: false,
                    }));
                    const newPlan: InstallmentPlan = { id: newPlanId, title, payments, loanAmount: parseFloat(loanAmount) || 0 };
                    actions.saveInstallmentPlan(newPlan);
                }
                break;
            }
            case 'installmentPayment': {
                const { planId, id: paymentId, amount, dueDate, penalty } = itemData;
                actions.updateInstallmentPayment(planId, { id: paymentId, amount: parseFloat(amount) || 0, dueDate, penalty: parseFloat(penalty) || 0 });
                break;
            }
            case 'check': {
                actions.saveCheck({ 
                    ...itemData, 
                    id, 
                    amount: parseFloat(itemData.amount) || 0,
                    status: itemData.status || 'pending'
                });
                break;
            }
        }
        closeModal();
    };

    const handleDelete = useCallback((itemType: string, id: string, personId?: string) => {
        const actions = useAccountantStore.getState();
        const performDelete = () => {
            switch (itemType) {
                case 'transaction':
                    actions.deleteTransaction(id);
                    break;
                case 'person':
                    actions.deletePerson(id);
                    break;
                case 'ledger':
                    if (personId) actions.deleteLedgerEntry(personId, id);
                    break;
                case 'installmentPlan':
                    actions.deleteInstallmentPlan(id);
                    setCurrentInstallment(null);
                    break;
                case 'check':
                    actions.deleteCheck(id);
                    break;
            }
        };

        let title = 'حذف مورد';
        let message = 'آیا از حذف این مورد اطمینان دارید؟ این عملیات قابل بازگشت نیست.';

        switch (itemType) {
            case 'transaction':
                title = 'حذف تراکنش';
                message = 'این تراکنش به طور کامل از تاریخچه شما حذف می‌شود و قابل بازگشت نیست. مطمئن هستید؟';
                break;
            case 'person':
                title = 'حذف شخص و سوابق حساب';
                message = 'با حذف این شخص، تمام ردیف‌های حساب مربوط به او نیز حذف می‌شود. آیا از انجام این کار اطمینان دارید؟';
                break;
            case 'ledger':
                title = 'حذف ردیف حساب';
                message = 'این ردیف حساب بین شما و این شخص حذف می‌شود و روی مانده حساب او تاثیر می‌گذارد. مطمئن هستید؟';
                break;
            case 'installmentPlan':
                title = 'حذف طرح اقساط';
                message = 'با حذف این طرح، تمام اقساط ثبت شده برای آن نیز حذف می‌شوند. آیا از انجام این کار اطمینان دارید؟';
                break;
            case 'check':
                title = 'حذف چک';
                message = 'این چک و وضعیت‌های ثبت شده برای آن حذف می‌شود. آیا از انجام این کار اطمینان دارید؟';
                break;
        }

        setConfirmState({
            open: true,
            title,
            message,
            confirmText: 'بله، حذف شود',
            cancelText: 'انصراف',
            tone: 'danger',
            onConfirm: performDelete,
        });
    }, []);

    const handleSettle = useCallback((personId: string, ledgerId: string) => {
       useAccountantStore.getState().toggleSettle(personId, ledgerId);
    }, []);

    const handleTogglePaidStatus = useCallback((planId: string, paymentId: string) => {
       useAccountantStore.getState().togglePaidStatus(planId, paymentId);
    }, []);

     const handleUpdateCheckStatus = useCallback((checkId: string, status: CheckStatus) => {
       useAccountantStore.getState().updateCheckStatus(checkId, status);
    }, []);

    // Stable per-view callbacks bundled in one memo (both deps are stable), so the
    // memoized views keep identical prop identities across unrelated container
    // re-renders. Without this, the inline closures would defeat React.memo.
    const cb = useMemo(() => ({
        editTransaction: (t: Transaction) => openModal('transaction', t),
        deleteTransaction: (id: string) => handleDelete('transaction', id),
        editCheck: (c: any) => openModal('check', c),
        deleteCheck: (id: string) => handleDelete('check', id),
        editPlan: (plan: any) => openModal('installmentPlan', plan),
        deletePlan: (id: string) => handleDelete('installmentPlan', id),
        editPayment: (p: any) => openModal('installmentPayment', p),
        editPerson: (p: Person) => openModal('person', p),
        deletePerson: (id: string) => handleDelete('person', id),
        editLedger: (l: LedgerEntry) => openModal('ledger', l),
        deleteLedger: (personId: string, ledgerId: string) => handleDelete('ledger', ledgerId, personId),
    }), [openModal, handleDelete]);

    const handleAddButtonClick = () => {
        let modalType: ModalConfig['type'] = undefined;
        let payload: any = null;

        switch (activeTab) {
            case 'summary':
            case 'transactions':
                modalType = 'transaction';
                break;
            case 'people':
                if (currentPerson) {
                    modalType = 'ledger';
                    payload = { personId: currentPerson.id };
                } else {
                    modalType = 'person';
                }
                break;
            case 'installments':
                 if (!currentInstallment) modalType = 'installmentPlan';
                break;
            case 'checks':
                modalType = 'check';
                break;
            case 'social_insurance':
                const evt = new CustomEvent('open-social-insurance-modal');
                window.dispatchEvent(evt);
                break;
        }
        if (modalType) {
            openModal(modalType, payload);
        }
    };

    const isAddButtonDisabled = (activeTab === 'installments' && !!currentInstallment);

    return (
        <div className="max-w-md mx-auto px-4 pt-3 pb-4">
            <AccountantFormModal isOpen={modal.isOpen} onClose={closeModal} onSave={handleSave} type={modal.type} payload={modal.payload} />
            <TransactionVoucherModal transaction={viewTransaction} onClose={() => setViewTransaction(null)} />
            <LedgerEntrySummaryModal entry={viewLedgerEntry} person={viewLedgerPerson} onClose={() => setViewLedgerEntry(null)} />
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
            
            <div className="flex items-center justify-between mb-5 gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-100">حسابدار هوشمند</h2>
                <div className="flex items-center gap-2">
                    <button onClick={handleAddButtonClick} disabled={isAddButtonDisabled} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2 px-3.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed">
                        <PlusIcon />
                        <span>{currentPerson ? "افزودن حساب" : (activeTab === 'installments' && !currentInstallment) ? "افزودن قسط" : "افزودن"}</span>
                    </button>
                    <button onClick={onNavigateBack} className="w-10 h-10 flex items-center justify-center bg-slate-800/70 hover:bg-slate-700 text-slate-300 rounded-xl transition" title="بازگشت به داشبورد">
                        <BackIcon />
                    </button>
                </div>
            </div>

            {/* Tabs (draggable) */}
            <div className="mb-6">
                <div className="border-b border-white/10">
                    <nav className="-mb-px flex space-x-4 space-x-reverse overflow-x-auto" aria-label="Tabs">
                        {(() => {
                            const setTabsOrder = useAccountantStore.getState().setTabsOrder;
                            const all = [
                                { id: 'summary', title: 'خلاصه', icon: <SummaryIcon /> },
                                { id: 'transactions', title: 'تراکنش‌ها', icon: <TransactionsIcon /> },
                                { id: 'people', title: 'حساب با دیگران', icon: <PeopleIcon /> },
                                { id: 'installments', title: 'اقساط', icon: <InstallmentsIcon /> },
                                { id: 'checks', title: 'چک‌ها', icon: <ChecksIcon /> },
                                { id: 'social_insurance', title: 'تامین اجتماعی', icon: <WalletIcon /> },
                                { id: 'darfak', title: 'درفک (ساخت‌وساز)', icon: <TransactionsIcon /> },
                            ] as { id: AccountantTab; title: string; icon: React.ReactNode }[];
                            const idToTab = new Map(all.map(t => [t.id, t] as const));
                            const ordered = tabsOrder?.length ? tabsOrder.map(id => idToTab.get(id)).filter(Boolean) as typeof all : all;
                            const handleDrop = (e: React.DragEvent<HTMLButtonElement>, toId: AccountantTab) => {
                                e.preventDefault();
                                const fromId = e.dataTransfer.getData('text/plain') as AccountantTab;
                                if (!fromId || fromId === toId) return;
                                const current = ordered.map(t => t.id);
                                const fromIdx = current.indexOf(fromId);
                                const toIdx = current.indexOf(toId);
                                if (fromIdx === -1 || toIdx === -1) return;
                                const next = [...current];
                                next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
                                setTabsOrder(next as AccountantTab[]);
                            };
                            return ordered.map(tab => (
                                <button
                                    key={tab.id}
                                    draggable
                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', tab.id); }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, tab.id)}
                                    onClick={() => setActiveTab(tab.id as AccountantTab)}
                                    className={`${activeTab === tab.id ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                    title="برای جابجایی بکشید و رها کنید"
                                >
                                    <span className="ml-2">{tab.icon}</span>
                                    {tab.title}
                                </button>
                            ));
                        })()}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'summary' && <SummaryView data={data} />}
                {activeTab === 'transactions' && <TransactionsView transactions={data.transactions} onEdit={cb.editTransaction} onDelete={cb.deleteTransaction} onView={setViewTransaction} />}
                {activeTab === 'checks' && <ChecksView checks={data.checks} onEdit={cb.editCheck} onDelete={cb.deleteCheck} onStatusChange={handleUpdateCheckStatus} />}
                {activeTab === 'installments' && <InstallmentsView installments={data.installments} currentInstallment={currentInstallment} setCurrentInstallment={setCurrentInstallment} onEditPlan={cb.editPlan} onDeletePlan={cb.deletePlan} onEditPayment={cb.editPayment} onTogglePaidStatus={handleTogglePaidStatus} />}
                {activeTab === 'people' && <PeopleView data={data} onEditPerson={cb.editPerson} onDeletePerson={cb.deletePerson} onEditLedger={cb.editLedger} onDeleteLedger={cb.deleteLedger} onSettle={handleSettle} currentPerson={currentPerson} setCurrentPerson={setCurrentPerson} onViewLedger={setViewLedgerEntry} />}
                {activeTab === 'social_insurance' && <SocialInsuranceView />}
                {activeTab === 'darfak' && <DarfakView />}
            </div>
        </div>
    );
};
