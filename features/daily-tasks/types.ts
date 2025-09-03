export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: string; // ISO string
  priority: TaskPriority;
  projectId?: string;
  subtasks: Subtask[];
  tags: string[];
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
}

export interface Project {
  id: string;
  name: string;
  color: string; // e.g., 'bg-blue-500'
}

export interface DailyTasksData {
    tasks: Task[];
    projects: Project[];
}