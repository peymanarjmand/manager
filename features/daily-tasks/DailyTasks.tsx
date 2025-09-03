import React, { useState, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { useDailyTasksStore } from './store';
import { Task, Project, Subtask, TaskPriority } from './types';
import { PRIORITIES, PROJECTS_COLORS } from './constants';
import { BackIcon, InboxIcon, CalendarIcon, UpcomingIcon, ProjectIcon, PlusIcon, CloseIcon, EditIcon, DeleteIcon, SearchIcon, CompletedIcon, TagIcon, ChevronDownIcon, CalendarViewIcon, ArrowRightIcon, ArrowLeftIcon } from '../../components/Icons';

type Filter = { type: 'inbox' | 'today' | 'upcoming' | 'completed' | 'project' | 'tag' | 'calendar'; id?: string; };


// Custom Jalali Date Picker
const Select = ({ id, value, onChange, children, className = "" }) => (
    <select
        id={id}
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-700/50 text-white rounded-md p-2 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none transition ${className}`}
    >
        {children}
    </select>
);

const JalaliDatePicker = ({ value, onChange, id, label }) => {
    const m = useMemo(() => moment(value || new Date()), [value]);
    
    const [jYear, setJYear] = useState(() => m.jYear());
    const [jMonth, setJMonth] = useState(() => m.jMonth()); // 0-indexed
    const [jDay, setJDay] = useState(() => m.jDate());

    useEffect(() => {
        const newMoment = moment(value);
        if (newMoment.isValid()) {
            setJYear(newMoment.jYear());
            setJMonth(newMoment.jMonth());
            setJDay(newMoment.jDate());
        }
    }, [value]);

    const handlePartChange = (part, newValueStr) => {
        const newValue = parseInt(newValueStr, 10);
        let year = jYear;
        let month = jMonth;
        let day = jDay;

        if (part === 'year') year = newValue;
        if (part === 'month') month = newValue;
        if (part === 'day') day = newValue;
        
        const daysInNewMonth = moment.jDaysInMonth(year, month);
        if (day > daysInNewMonth) {
            day = daysInNewMonth;
        }
        
        const finalMoment = moment(`${year}/${month + 1}/${day}`, 'jYYYY/jM/jD');
        onChange(finalMoment.toISOString());
    };
    
    const currentJYear = moment().jYear();
    const years = Array.from({ length: 20 }, (_, i) => currentJYear - 10 + i);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);
    const daysInSelectedMonth = moment.jDaysInMonth(jYear, jMonth);
    const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

    return (
        <div>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <div className="grid grid-cols-3 gap-2">
                 <Select id={`${id}-day`} value={jDay} onChange={(e) => handlePartChange('day', e.target.value)}>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
                <Select id={`${id}-month`} value={jMonth} onChange={(e) => handlePartChange('month', e.target.value)}>
                    {months.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </Select>
                <Select id={`${id}-year`} value={jYear} onChange={(e) => handlePartChange('year', e.target.value)}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
            </div>
        </div>
    );
};

// Main Component
export const DailyTasks = ({ onNavigateBack }: { onNavigateBack: () => void; }) => {
    const [activeFilter, setActiveFilter] = useState<Filter>({ type: 'inbox' });
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isProjectModalOpen, setProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [calendarViewDate, setCalendarViewDate] = useState(moment());
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(moment().toISOString());

    const tasks = useDailyTasksStore(state => state.tasks);
    const projects = useDailyTasksStore(state => state.projects);
    const { addTask } = useDailyTasksStore.getState();

    useEffect(() => {
        if (selectedTask) {
            const updatedTask = tasks.find(t => t.id === selectedTask.id);
            setSelectedTask(updatedTask || null);
        }
    }, [tasks, selectedTask]);
    
    useEffect(() => {
        // When switching to calendar view, select today's date
        if (activeFilter.type === 'calendar') {
            setSelectedCalendarDate(moment().toISOString());
        }
    }, [activeFilter.type]);

    const handleSelectTask = (task: Task) => {
        setSelectedTask(task);
    };

    const handleCloseDetails = () => {
        setSelectedTask(null);
    };

    const handleAddTask = () => {
        let dueDate: string | undefined = undefined;
        if (activeFilter.type === 'today') {
            dueDate = new Date().toISOString();
        } else if (activeFilter.type === 'calendar') {
            dueDate = selectedCalendarDate;
        }

        const newTaskId = addTask({
            title: 'کار جدید',
            priority: 'medium',
            projectId: activeFilter.type === 'project' ? activeFilter.id : undefined,
            dueDate: dueDate,
        });
        const newTask = useDailyTasksStore.getState().tasks.find(t => t.id === newTaskId);
        if (newTask) {
            setSelectedTask(newTask);
        }
    };


    return (
        <div className="container mx-auto px-4 py-8 sm:py-12 relative">
             <ProjectModal 
                isOpen={isProjectModalOpen}
                onClose={() => { setProjectModalOpen(false); setEditingProject(null); }}
                project={editingProject}
            />

            <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                     <button onClick={onNavigateBack} className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-lg transition" title="بازگشت به داشبورد">
                        <BackIcon />
                    </button>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">کارهای روزانه</h2>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-6">
                <Sidebar 
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    projects={projects}
                    tasks={tasks}
                    onAddProject={() => { setEditingProject(null); setProjectModalOpen(true); }}
                    onEditProject={(p) => { setEditingProject(p); setProjectModalOpen(true); }}
                />
                
                <div className={`transition-all duration-300 ${selectedTask ? 'col-span-12 lg:col-span-6' : 'col-span-12 md:col-span-9'}`}>
                    {activeFilter.type === 'calendar' && (
                        <div className="mb-6">
                            <JalaliCalendar 
                                viewDate={calendarViewDate}
                                onMonthChange={setCalendarViewDate}
                                selectedDate={selectedCalendarDate}
                                onDateSelect={setSelectedCalendarDate}
                                tasks={tasks}
                            />
                        </div>
                    )}
                    <TaskList 
                        filter={activeFilter} 
                        onSelectTask={handleSelectTask}
                        projects={projects}
                        tasks={tasks}
                        calendarDate={selectedCalendarDate}
                    />
                </div>
                
                {selectedTask && (
                    <div className="col-span-12 lg:col-span-3 animate-fade-in">
                       <TaskDetails task={selectedTask} onClose={handleCloseDetails} projects={projects} />
                    </div>
                )}
            </div>
            <button onClick={handleAddTask} className="fixed bottom-8 left-8 bg-sky-500 hover:bg-sky-600 text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg transition transform hover:scale-110" title="افزودن کار جدید">
                <PlusIcon />
            </button>
        </div>
    );
};

// Sidebar Component
const Sidebar = ({ activeFilter, setActiveFilter, projects, tasks, onAddProject, onEditProject }) => {
    const today = moment().endOf('day');

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        tasks.forEach(task => task.tags?.forEach(tag => tagSet.add(tag)));
        return Array.from(tagSet).sort();
    }, [tasks]);

    const getTaskCount = (filter: Filter) => {
        switch (filter.type) {
            case 'inbox': return tasks.filter(t => !t.isCompleted).length;
            case 'today': return tasks.filter(t => !t.isCompleted && t.dueDate && moment(t.dueDate).isSame(today, 'day')).length;
            case 'upcoming': return tasks.filter(t => !t.isCompleted && t.dueDate && moment(t.dueDate).isAfter(today)).length;
            case 'completed': return tasks.filter(t => t.isCompleted).length;
            case 'project': return tasks.filter(t => !t.isCompleted && t.projectId === filter.id).length;
            case 'tag': return tasks.filter(t => !t.isCompleted && t.tags?.includes(filter.id)).length;
            default: return 0;
        }
    };

    const views: { filter: Filter; label: string; icon: React.ReactNode; }[] = [
        { filter: { type: 'inbox' }, label: 'اینباکس', icon: <InboxIcon /> },
        { filter: { type: 'today' }, label: 'امروز', icon: <CalendarIcon className="h-5 w-5" /> },
        { filter: { type: 'upcoming' }, label: 'آینده', icon: <UpcomingIcon /> },
        { filter: { type: 'calendar' }, label: 'تقویم', icon: <CalendarViewIcon /> },
        { filter: { type: 'completed' }, label: 'تکمیل‌شده', icon: <CompletedIcon /> },
    ];
    
    return (
        <aside className="col-span-12 md:col-span-3">
            <div className="space-y-4">
                <div className="space-y-1">
                    {views.map(view => (
                        <FilterButton 
                            key={view.filter.type} 
                            label={view.label}
                            icon={view.icon}
                            isActive={activeFilter.type === view.filter.type}
                            count={view.filter.type === 'calendar' ? null : getTaskCount(view.filter)}
                            onClick={() => setActiveFilter(view.filter)}
                        />
                    ))}
                </div>
                
                <div className="pt-4">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <h3 className="text-lg font-semibold text-slate-300">پروژه‌ها</h3>
                        <button onClick={onAddProject} className="text-slate-400 hover:text-sky-400 transition" title="افزودن پروژه"><PlusIcon /></button>
                    </div>
                     <div className="space-y-1">
                        {projects.map(project => (
                             <FilterButton 
                                key={project.id} 
                                label={project.name}
                                icon={<span className={`h-3 w-3 rounded-full ${project.color}`}></span>}
                                isActive={activeFilter.type === 'project' && activeFilter.id === project.id}
                                count={getTaskCount({type: 'project', id: project.id})}
                                onClick={() => setActiveFilter({type: 'project', id: project.id})}
                                onEdit={() => onEditProject(project)}
                            />
                        ))}
                    </div>
                </div>

                {allTags.length > 0 && (
                    <div className="pt-4">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <h3 className="text-lg font-semibold text-slate-300">تگ‌ها</h3>
                        </div>
                        <div className="space-y-1">
                            {allTags.map(tag => (
                                <FilterButton
                                    key={tag}
                                    label={tag}
                                    icon={<TagIcon />}
                                    isActive={activeFilter.type === 'tag' && activeFilter.id === tag}
                                    count={getTaskCount({ type: 'tag', id: tag })}
                                    onClick={() => setActiveFilter({ type: 'tag', id: tag })}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

// Filter Button Component
const FilterButton = ({ label, icon, isActive, count, onClick, onEdit=null }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between text-right px-3 py-2 rounded-lg transition-colors group ${isActive ? 'bg-sky-500/10 text-sky-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-sky-300"><EditIcon /></button>}
            {count !== null && count > 0 && <span className={`text-sm font-semibold ${isActive ? 'text-sky-400' : 'text-slate-500'}`}>{count}</span>}
        </div>
    </button>
);


// Jalali Calendar Component
const JalaliCalendar = ({ viewDate, onMonthChange, selectedDate, onDateSelect, tasks }) => {
    const taskDates = useMemo(() => {
        return new Set(tasks.filter(t => t.dueDate).map(t => moment(t.dueDate).format('jYYYY-jM-jD')));
    }, [tasks]);

    const todayJalali = moment().format('jYYYY-jM-jD');
    const selectedJalali = moment(selectedDate).format('jYYYY-jM-jD');
    
    const firstDayOfMonth = viewDate.clone().startOf('jMonth');
    const daysInMonth = viewDate.jDaysInMonth();
    const startDayOfWeek = (firstDayOfMonth.day() + 1) % 7; // Saturday is 6, so we get 0 for Shanbeh.

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`}></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dayMoment = viewDate.clone().jDate(d);
        const dayJalali = dayMoment.format('jYYYY-jM-jD');
        const isToday = dayJalali === todayJalali;
        const isSelected = dayJalali === selectedJalali;
        const hasTasks = taskDates.has(dayJalali);

        let classes = "relative w-10 h-10 flex flex-col items-center justify-center rounded-full transition-colors cursor-pointer";
        if (isSelected) {
            classes += " bg-sky-500 text-white font-bold";
        } else if (isToday) {
            classes += " bg-sky-500/20 text-sky-300";
        } else {
            classes += " text-slate-200 hover:bg-slate-700";
        }

        days.push(
            <div key={d} className="flex justify-center items-center">
                <button onClick={() => onDateSelect(dayMoment.toISOString())} className={classes}>
                    {dayMoment.locale('fa').format('jD')}
                    {hasTasks && <div className="absolute bottom-1.5 h-1.5 w-1.5 bg-emerald-400 rounded-full"></div>}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 ring-1 ring-slate-700">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => onMonthChange(viewDate.clone().subtract(1, 'jMonth'))} className="p-2 rounded-full hover:bg-slate-700"><ArrowRightIcon /></button>
                <h3 className="text-lg font-bold text-slate-100">{viewDate.locale('fa').format('jMMMM jYYYY')}</h3>
                <button onClick={() => onMonthChange(viewDate.clone().add(1, 'jMonth'))} className="p-2 rounded-full hover:bg-slate-700"><ArrowLeftIcon /></button>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-slate-400 text-sm">
                {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(day => <div key={day}>{day}</div>)}
                {days}
            </div>
        </div>
    );
};


// Task List Component
const TaskList = ({ filter, onSelectTask, projects, tasks, calendarDate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(true);

    const { activeTasks, completedTasks } = useMemo(() => {
        let filtered = [...tasks];
        
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(t => t.title.toLowerCase().includes(lowerSearch) || t.description?.toLowerCase().includes(lowerSearch));
        }
        
        const now = moment();
        switch (filter.type) {
            case 'inbox': break;
            case 'today': filtered = filtered.filter(t => t.dueDate && moment(t.dueDate).isSame(now, 'day')); break;
            case 'upcoming': filtered = filtered.filter(t => t.dueDate && moment(t.dueDate).isAfter(now, 'day')); break;
            case 'project': filtered = filtered.filter(t => t.projectId === filter.id); break;
            case 'tag': filtered = filtered.filter(t => t.tags?.includes(filter.id)); break;
            case 'completed': filtered = filtered.filter(t => t.isCompleted); break;
            case 'calendar': filtered = filtered.filter(t => t.dueDate && moment(t.dueDate).isSame(moment(calendarDate), 'day')); break;
        }

        const active = filtered.filter(t => !t.isCompleted).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const completed = filtered.filter(t => t.isCompleted).sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        
        return { activeTasks: active, completedTasks: completed };
    }, [tasks, filter, searchTerm, calendarDate]);

    const getFilterTitle = () => {
        switch(filter.type) {
            case 'inbox': return 'اینباکس';
            case 'today': return 'امروز';
            case 'upcoming': return 'آینده';
            case 'completed': return 'تکمیل‌شده';
            case 'calendar': return `کارها برای: ${moment(calendarDate).locale('fa').format('dddd, jD jMMMM')}`;
            case 'project': return projects.find(p => p.id === filter.id)?.name || 'پروژه';
            case 'tag': return `#${filter.id}`;
        }
    };
    
    const tasksToRender = filter.type === 'completed' ? completedTasks : activeTasks;

    return (
        <div className="bg-slate-800/50 rounded-xl p-4 md:p-6 ring-1 ring-slate-700 h-full flex flex-col">
            <header className="mb-4">
                <h2 className="text-2xl font-bold text-slate-100 mb-4">{getFilterTitle()}</h2>
                 <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><SearchIcon /></span>
                    <input type="search" placeholder="جستجوی کار..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-700/60 text-white rounded-md py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-sky-400 focus:outline-none transition placeholder-slate-500" />
                </div>
            </header>

            <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                {tasksToRender.map(task => <TaskCard key={task.id} task={task} onSelectTask={onSelectTask} projects={projects} />)}
                
                {tasksToRender.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-slate-400">هیچ کاری در این لیست وجود ندارد.</p>
                    </div>
                )}

                {filter.type !== 'completed' && completedTasks.length > 0 && (
                    <div className="pt-6">
                        <button onClick={() => setShowCompleted(!showCompleted)} className="w-full flex justify-between items-center text-slate-400 hover:text-white transition mb-2">
                            <span className="font-semibold">تکمیل شده ({completedTasks.length})</span>
                            <ChevronDownIcon />
                        </button>
                        {showCompleted && (
                             <div className="space-y-2 animate-fade-in">
                                {completedTasks.map(task => <TaskCard key={task.id} task={task} onSelectTask={onSelectTask} projects={projects} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Task Card Component
const TaskCard = ({ task, onSelectTask, projects }) => {
    const { toggleTaskCompletion } = useDailyTasksStore.getState();
    const project = projects.find(p => p.id === task.projectId);
    const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;

    return (
        <div onClick={() => onSelectTask(task)} className="bg-slate-800 rounded-lg p-3 flex items-start gap-3 cursor-pointer ring-1 ring-transparent hover:ring-sky-500 transition-all">
            <button onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task.id); }} className="mt-1 flex-shrink-0">
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${task.isCompleted ? 'bg-sky-400 border-sky-400' : 'border-slate-500 hover:border-sky-400'}`}>
                    {task.isCompleted && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                </div>
            </button>
            <div className="flex-1 min-w-0">
                <p className={`text-slate-100 ${task.isCompleted ? 'line-through text-slate-500' : ''}`}>{task.title}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                    {task.dueDate && <span className={`${moment(task.dueDate).isBefore(moment().startOf('day')) && !task.isCompleted ? 'text-rose-400' : ''}`}>{moment(task.dueDate).locale('fa').format('jD jMMMM')}</span>}
                    {project && <div className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${project.color}`}></span><span>{project.name}</span></div>}
                    {task.subtasks.length > 0 && <span>{completedSubtasks}/{task.subtasks.length}</span>}
                    {(task.tags || []).map(tag => <span key={tag} className="text-cyan-400">#{tag}</span>)}
                </div>
            </div>
            <PriorityIcon priority={task.priority} />
        </div>
    );
};

const PriorityIcon = ({ priority }: { priority: TaskPriority }) => {
    const priorityInfo = PRIORITIES.find(p => p.id === priority);
    if (!priorityInfo) return null;
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${priorityInfo.color} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={priorityInfo.iconPath} />
        </svg>
    );
};


// Task Details Component
const TaskDetails = ({ task, onClose, projects }) => {
    const { updateTask, deleteTask, addSubtask, deleteSubtask, toggleSubtaskCompletion } = useDailyTasksStore.getState();
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newTag, setNewTag] = useState('');

    const handleUpdate = (updates: Partial<Task>) => {
        updateTask(task.id, updates);
    };

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSubtaskTitle.trim()) {
            addSubtask(task.id, { title: newSubtaskTitle });
            setNewSubtaskTitle('');
        }
    };
    
    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTag = newTag.trim();
        if (trimmedTag && !(task.tags || []).includes(trimmedTag)) {
            handleUpdate({ tags: [...(task.tags || []), trimmedTag] });
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        handleUpdate({ tags: (task.tags || []).filter(t => t !== tagToRemove) });
    };
    
    return (
         <div className="bg-slate-800/50 rounded-xl ring-1 ring-slate-700 h-full flex flex-col">
            <header className="p-4 flex justify-between items-center border-b border-slate-700">
                <div className="text-sm text-slate-400">ایجاد شده در {moment(task.createdAt).locale('fa').format('jD jMMMM jYYYY')}</div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition"><CloseIcon /></button>
            </header>
            <div className="p-4 space-y-4 overflow-y-auto flex-grow">
                 <input
                    type="text"
                    value={task.title}
                    onChange={e => handleUpdate({ title: e.target.value })}
                    className="w-full bg-transparent text-xl font-bold text-slate-100 focus:outline-none border-b-2 border-transparent focus:border-sky-400 transition"
                />
                <textarea
                    value={task.description || ''}
                    onChange={e => handleUpdate({ description: e.target.value })}
                    placeholder="توضیحات..."
                    rows={3}
                    className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition placeholder-slate-400 text-sm"
                />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <JalaliDatePicker 
                            label="تاریخ سررسید"
                            id="dueDate"
                            value={task.dueDate}
                            onChange={(isoDate) => handleUpdate({ dueDate: isoDate })}
                        />
                        {task.dueDate && (
                           <button onClick={() => handleUpdate({ dueDate: undefined })} className="text-xs text-rose-400 hover:underline mt-1">
                                حذف تاریخ
                            </button>
                        )}
                    </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">پروژه</label>
                         <select value={task.projectId || ''} onChange={e => handleUpdate({ projectId: e.target.value || undefined })} className="bg-slate-700/50 rounded-md p-2 text-sm text-white focus:ring-sky-400 h-full">
                             <option value="">هیچکدام</option>
                             {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                    </div>
                </div>
                 <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">اولویت</label>
                    <div className="flex gap-2">
                        {PRIORITIES.map(p => (
                            <button key={p.id} onClick={() => handleUpdate({ priority: p.id })} className={`w-full p-2 rounded-md transition ${task.priority === p.id ? 'bg-sky-500 text-white' : 'bg-slate-700/50 hover:bg-slate-700'}`}>
                                <span className="text-sm">{p.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="pt-2">
                    <h4 className="font-semibold text-slate-300 mb-2">زیرمجموعه کارها</h4>
                    <div className="space-y-2">
                        {task.subtasks.map(sub => (
                             <div key={sub.id} className="flex items-center gap-3 bg-slate-700/40 p-2 rounded-md group">
                                 <input type="checkbox" checked={sub.isCompleted} onChange={() => toggleSubtaskCompletion(task.id, sub.id)} className="h-4 w-4 rounded-full flex-shrink-0 border-2 bg-transparent border-slate-500 text-sky-500 focus:ring-sky-400" style={{ accentColor: 'var(--sky-500)' }}/>
                                 <span className={`flex-1 text-sm ${sub.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>{sub.title}</span>
                                 <button onClick={() => deleteSubtask(task.id, sub.id)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"><DeleteIcon /></button>
                             </div>
                        ))}
                    </div>
                     <form onSubmit={handleAddSubtask} className="mt-2 flex gap-2">
                         <input type="text" value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} placeholder="افزودن زیرمجموعه..." className="flex-1 bg-slate-700/80 text-sm rounded-md py-1 px-2 focus:ring-1 focus:ring-sky-400 focus:outline-none" />
                         <button type="submit" className="text-sm bg-sky-600/50 hover:bg-sky-600 px-3 py-1 rounded-md transition">افزودن</button>
                     </form>
                </div>
                
                 <div className="pt-2">
                    <h4 className="font-semibold text-slate-300 mb-2">تگ‌ها</h4>
                     <div className="flex flex-wrap gap-1 mb-2">
                        {(task.tags || []).map(tag => (
                            <div key={tag} className="bg-sky-500/20 text-sky-300 text-xs font-medium pl-2 pr-1 py-1 rounded-full flex items-center gap-1">
                                <span>#{tag}</span>
                                <button onClick={() => handleRemoveTag(tag)} className="text-sky-400 hover:text-white leading-none">&times;</button>
                            </div>
                        ))}
                    </div>
                     <form onSubmit={handleAddTag} className="mt-2 flex gap-2">
                         <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="افزودن تگ..." className="flex-1 bg-slate-700/80 text-sm rounded-md py-1 px-2 focus:ring-1 focus:ring-sky-400 focus:outline-none" />
                         <button type="submit" className="text-sm bg-sky-600/50 hover:bg-sky-600 px-3 py-1 rounded-md transition">افزودن</button>
                     </form>
                </div>

            </div>
            <footer className="p-4 border-t border-slate-700">
                <button onClick={() => { deleteTask(task.id); onClose(); }} className="text-rose-400 hover:text-rose-300 text-sm flex items-center gap-2">
                    <DeleteIcon/>
                    <span>حذف کار</span>
                </button>
            </footer>
        </div>
    );
};


const ProjectModal = ({ isOpen, onClose, project }) => {
    if (!isOpen) return null;

    const { addProject, updateProject, deleteProject } = useDailyTasksStore.getState();
    const [name, setName] = useState(project?.name || '');
    const [color, setColor] = useState(project?.color || PROJECTS_COLORS[0]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            if (project) {
                updateProject(project.id, { name, color });
            } else {
                addProject({ name, color });
            }
            onClose();
        }
    };
    
    const handleDelete = () => {
        if(project && window.confirm(`آیا از حذف پروژه "${project.name}" اطمینان دارید؟ کارهای داخل آن حذف نخواهند شد.`)){
            deleteProject(project.id);
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-xl w-full max-w-sm shadow-2xl ring-1 ring-slate-700" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="p-4 border-b border-slate-700">
                         <h3 className="text-xl font-bold text-slate-100">{project ? 'ویرایش پروژه' : 'پروژه جدید'}</h3>
                    </header>
                    <div className="p-6 space-y-4">
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="نام پروژه" 
                            className="w-full bg-slate-700/50 text-white rounded-md py-2.5 px-4 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
                            required
                        />
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">رنگ پروژه</label>
                            <div className="grid grid-cols-8 gap-2">
                                {PROJECTS_COLORS.map(c => (
                                    <button key={c} type="button" onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ${c} transition transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}></button>
                                ))}
                            </div>
                        </div>
                    </div>
                     <footer className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-between items-center">
                         <div>
                            {project && <button type="button" onClick={handleDelete} className="text-rose-400 text-sm">حذف</button>}
                         </div>
                         <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700">لغو</button>
                            <button type="submit" className="py-2 px-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md text-sm">ذخیره</button>
                         </div>
                    </footer>
                </form>
            </div>
        </div>
    )
}