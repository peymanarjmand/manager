import { TaskPriority } from './types';

export const PRIORITIES: { id: TaskPriority, name: string, color: string, iconPath: string }[] = [
    { id: 'low', name: 'پایین', color: 'text-slate-400', iconPath: 'M19 9l-7 7-7-7' },
    { id: 'medium', name: 'متوسط', color: 'text-sky-400', iconPath: 'M5 15h14' },
    { id: 'high', name: 'بالا', color: 'text-amber-400', iconPath: 'M5 15l7-7 7 7' },
    { id: 'urgent', name: 'فوری', color: 'text-rose-500', iconPath: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
];

export const PROJECTS_COLORS = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500', 'bg-violet-500', 'bg-indigo-500',
    'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-green-500',
    'bg-lime-500', 'bg-yellow-500', 'bg-amber-500', 'bg-orange-500'
];
