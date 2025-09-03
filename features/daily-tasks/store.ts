import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DailyTasksData, Task, Project, Subtask } from './types';

const STORAGE_KEY = 'lifeManagerDailyTasks';

interface DailyTasksState extends DailyTasksData {
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'isCompleted' | 'subtasks' | 'tags'>) => string;
    updateTask: (taskId: string, updates: Partial<Task>) => void;
    deleteTask: (taskId: string) => void;
    toggleTaskCompletion: (taskId: string) => void;
    
    addProject: (project: Omit<Project, 'id'>) => void;
    updateProject: (projectId: string, updates: Partial<Project>) => void;
    deleteProject: (projectId: string) => void;
    
    addSubtask: (taskId: string, subtaskData: { title: string }) => void;
    updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
    deleteSubtask: (taskId: string, subtaskId: string) => void;
    toggleSubtaskCompletion: (taskId: string, subtaskId: string) => void;
}

export const useDailyTasksStore = create<DailyTasksState>()(
    persist(
        (set, get) => ({
            tasks: [],
            projects: [
                { id: 'personal', name: 'کارهای شخصی', color: 'bg-sky-500'},
                { id: 'work', name: 'کارهای تجاری', color: 'bg-violet-500'}
            ],
            // Task actions
            addTask: (taskData) => {
                const newTask: Task = {
                    ...taskData,
                    id: Date.now().toString(),
                    createdAt: new Date().toISOString(),
                    isCompleted: false,
                    subtasks: [],
                    tags: [],
                };
                set((state) => ({ tasks: [...state.tasks, newTask] }));
                return newTask.id;
            },
            updateTask: (taskId, updates) => set((state) => ({
                tasks: state.tasks.map(task => 
                    task.id === taskId ? { ...task, ...updates } : task
                )
            })),
            deleteTask: (taskId) => set((state) => ({
                tasks: state.tasks.filter(task => task.id !== taskId)
            })),
            toggleTaskCompletion: (taskId) => set(state => ({
                tasks: state.tasks.map(task => {
                    if (task.id !== taskId) return task;
                    const isCompleted = !task.isCompleted;
                    return {
                        ...task,
                        isCompleted,
                        completedAt: isCompleted ? new Date().toISOString() : undefined,
                    };
                })
            })),
            
            // Project actions
            addProject: (projectData) => {
                const newProject: Project = { ...projectData, id: Date.now().toString() };
                set((state) => ({ projects: [...state.projects, newProject] }));
            },
            updateProject: (projectId, updates) => set((state) => ({
                projects: state.projects.map(proj => 
                    proj.id === projectId ? { ...proj, ...updates } : proj
                )
            })),
            deleteProject: (projectId) => set((state) => ({
                tasks: state.tasks.map(t => t.projectId === projectId ? {...t, projectId: undefined} : t),
                projects: state.projects.filter(proj => proj.id !== projectId)
            })),

            // Subtask actions
            addSubtask: (taskId, subtaskData) => set(state => {
                const newSubtask: Subtask = { ...subtaskData, id: Date.now().toString(), isCompleted: false };
                return {
                    tasks: state.tasks.map(task => 
                        task.id === taskId ? { ...task, subtasks: [...task.subtasks, newSubtask] } : task
                    )
                };
            }),
             updateSubtask: (taskId, subtaskId, updates) => set(state => ({
                tasks: state.tasks.map(task => {
                    if (task.id !== taskId) return task;
                    return {
                        ...task,
                        subtasks: task.subtasks.map(sub => 
                            sub.id === subtaskId ? { ...sub, ...updates } : sub
                        )
                    };
                })
            })),
            toggleSubtaskCompletion: (taskId, subtaskId) => set(state => ({
                tasks: state.tasks.map(task => {
                    if (task.id !== taskId) return task;
                    return {
                        ...task,
                        subtasks: task.subtasks.map(sub => 
                            sub.id === subtaskId ? { ...sub, isCompleted: !sub.isCompleted } : sub
                        )
                    };
                })
            })),
            deleteSubtask: (taskId, subtaskId) => set(state => ({
                tasks: state.tasks.map(task => 
                    task.id === taskId ? { ...task, subtasks: task.subtasks.filter(sub => sub.id !== subtaskId) } : task
                )
            }))
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
        }
    )
);