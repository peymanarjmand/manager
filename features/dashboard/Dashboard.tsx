import React, { useMemo, useState } from 'react';
import { DASHBOARD_ITEMS } from './constants';
import { DashboardItem, View } from '../../types';
import { DateTimeDisplay } from '../../components/DateTimeDisplay';
import { FocusTimer } from './components/FocusTimer';
import { SettingsModal } from '../settings/SettingsModal';
import { useDashboardStore } from './store';


interface DashboardCardProps {
    item: DashboardItem;
    onNavigate: (view: View) => void;
    onOpenSettings: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ item, onNavigate, onOpenSettings }) => {
    const isActionable = ['health-dashboard', 'password-manager', 'smart-accountant', 'phone-book', 'daily-tasks', 'assets', 'my-car', 'settings'].includes(item.id);
    const cardClasses = `group bg-slate-800/50 rounded-xl p-6 flex flex-col items-start space-y-4 ring-1 ring-slate-700 transition-all duration-300 transform shadow-lg ${isActionable ? 'hover:ring-sky-400 hover:-translate-y-1 cursor-pointer hover:shadow-sky-400/10' : 'opacity-70'}`;

    const handleCardClick = () => {
        if (item.id === 'settings') {
            onOpenSettings();
        } else if (isActionable) {
            onNavigate(item.id as View);
        }
    };
    
    return (
        <div className={cardClasses} onClick={handleCardClick} role={isActionable ? 'button' : 'listitem'} tabIndex={isActionable ? 0 : -1} onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}>
            <div className="bg-slate-700/50 p-3 rounded-full">
                {item.icon}
            </div>
            <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-100">{item.title}</h3>
                <p className="text-slate-400 mt-2 text-sm">{item.description}</p>
            </div>
            <div className="text-xs font-semibold text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity mt-auto pt-2">
                {isActionable ? "باز کردن" : "بزودی"}
            </div>
        </div>
    );
};


export const Dashboard = ({ onNavigate }: { onNavigate: (view: View) => void }): React.ReactNode => {
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const itemsOrder = useDashboardStore(state => state.itemsOrder);
    const setItemsOrder = useDashboardStore(state => state.setItemsOrder);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const orderedItems: DashboardItem[] = useMemo(() => {
        const map = new Map(DASHBOARD_ITEMS.map(i => [i.id, i] as const));
        const ordered: DashboardItem[] = [];
        (itemsOrder || []).forEach(id => {
            const item = map.get(id);
            if (item) {
                ordered.push(item);
                map.delete(id);
            }
        });
        const remaining = DASHBOARD_ITEMS.filter(i => map.has(i.id));
        return [...ordered, ...remaining];
    }, [itemsOrder]);

    const handleDrop = (fromId: string | null, toId: string) => {
        if (!fromId || fromId === toId) return;
        const current = itemsOrder && itemsOrder.length ? [...itemsOrder] : DASHBOARD_ITEMS.map(i => i.id);
        const fromIdx = current.indexOf(fromId);
        const toIdx = current.indexOf(toId);
        if (fromIdx === -1 || toIdx === -1) return;
        current.splice(toIdx, 0, current.splice(fromIdx, 1)[0]);
        setItemsOrder(current);
    };

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12">
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} />

            <div className="text-center mb-10">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                    داشبورد شما
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
                    ماژول مورد نظر خود را برای شروع انتخاب کنید.
                </p>
            </div>

            <div className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <DateTimeDisplay />
                <FocusTimer onOpenSettings={() => setSettingsModalOpen(true)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orderedItems.map((item) => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', item.id);
                            setDraggingId(item.id);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const fromId = e.dataTransfer.getData('text/plain') || draggingId;
                            handleDrop(fromId, item.id);
                            setDraggingId(null);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                    >
                        <DashboardCard item={item} onNavigate={onNavigate} onOpenSettings={() => setSettingsModalOpen(true)} />
                    </div>
                ))}
            </div>
        </div>
    );
};