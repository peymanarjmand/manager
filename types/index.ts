import { ReactNode } from 'react';

export interface DashboardItem {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
}
