import React from 'react';
import { PlusIcon, CalendarIcon, ChartIcon, FileTextIcon } from '../../../components/Icons';

interface QuickActionsProps {
  onWeightClick?: () => void;
  onBloodPressureClick?: () => void;
  onMedicineClick?: () => void;
  onMealClick?: () => void;
  onReportsClick?: () => void;
  onCalendarClick?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onWeightClick,
  onBloodPressureClick,
  onMedicineClick,
  onMealClick,
  onReportsClick,
  onCalendarClick
}) => {
  const actions = [
    {
      id: 'add-meal',
      title: 'افزودن وعده غذایی',
      description: 'ثبت وعده غذایی جدید',
      icon: <PlusIcon />,
      color: 'emerald',
      action: onMealClick
    },
    {
      id: 'add-medicine',
      title: 'افزودن دارو',
      description: 'ثبت داروی جدید',
      icon: <PlusIcon />,
      color: 'blue',
      action: onMedicineClick
    },
    {
      id: 'record-bp',
      title: 'ثبت فشار خون',
      description: 'اندازه‌گیری جدید فشار خون',
      icon: <ChartIcon />,
      color: 'purple',
      action: onBloodPressureClick
    },
    {
      id: 'record-weight',
      title: 'ثبت وزن',
      description: 'وزن جدید را ثبت کنید',
      icon: <ChartIcon />,
      color: 'orange',
      action: onWeightClick
    },
    {
      id: 'view-reports',
      title: 'گزارش‌ها',
      description: 'مشاهده گزارش‌های سلامتی',
      icon: <FileTextIcon />,
      color: 'slate',
      action: onReportsClick
    },
    {
      id: 'health-calendar',
      title: 'تقویم سلامت',
      description: 'برنامه‌ریزی و یادآوری‌ها',
      icon: <CalendarIcon />,
      color: 'pink',
      action: onCalendarClick
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      emerald: {
        bg: 'bg-emerald-600 hover:bg-emerald-700',
        text: 'text-emerald-400',
        border: 'border-emerald-500'
      },
      blue: {
        bg: 'bg-blue-600 hover:bg-blue-700',
        text: 'text-blue-400',
        border: 'border-blue-500'
      },
      purple: {
        bg: 'bg-purple-600 hover:bg-purple-700',
        text: 'text-purple-400',
        border: 'border-purple-500'
      },
      orange: {
        bg: 'bg-orange-600 hover:bg-orange-700',
        text: 'text-orange-400',
        border: 'border-orange-500'
      },
      slate: {
        bg: 'bg-slate-600 hover:bg-slate-700',
        text: 'text-slate-400',
        border: 'border-slate-500'
      },
      pink: {
        bg: 'bg-pink-600 hover:bg-pink-700',
        text: 'text-pink-400',
        border: 'border-pink-500'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.slate;
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 mb-8">
      <h2 className="text-xl font-bold text-slate-100 mb-6">اقدامات سریع</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const colors = getColorClasses(action.color);
          return (
            <button
              key={action.id}
              onClick={action.action}
              className={`p-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-right ${colors.bg} group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-full bg-slate-800/50 ${colors.text}`}>
                  {action.icon}
                </div>
                <div className={`w-2 h-2 rounded-full ${colors.border} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">
                {action.title}
              </h3>
              <p className="text-slate-200 text-xs opacity-80">
                {action.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Additional icons for health dashboard
const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);