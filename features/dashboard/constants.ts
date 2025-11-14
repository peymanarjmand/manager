import React from 'react';
import { DashboardItem } from '../../types';
import { KeyIcon, CalculatorIcon, PhoneBookIcon, TodoIcon, SettingsIcon, HomeBuildIcon, AssetsIcon, HeartIcon } from '../../components/Icons';

export const DASHBOARD_ITEMS: DashboardItem[] = [
  {
    id: 'health-dashboard',
    icon: React.createElement(HeartIcon),
    title: 'داشبورد سلامتی',
    description: 'مدیریت جامع سلامتی، تغذیه، داروها و فشار خون خود را دنبال کنید.',
  },

  {
    id: 'password-manager',
    icon: React.createElement(KeyIcon),
    title: 'مدیر رمز عبور',
    description: 'رمزهای عبور خود را به صورت ایمن ذخیره و مدیریت کنید.',
  },
  {
    id: 'assets',
    icon: React.createElement(AssetsIcon),
    title: 'دارایی‌ها',
    description: 'مدیریت و پیگیری دارایی‌های شخصی و ارزش آنها.',
  },
  {
    id: 'smart-accountant',
    icon: React.createElement(CalculatorIcon),
    title: 'حسابدار هوشمند',
    description: 'درآمد و هزینه‌های خود را بدون زحمت پیگیری کنید.',
  },
  {
    id: 'daily-tasks',
    icon: React.createElement(TodoIcon),
    title: 'کارهای روزانه',
    description: 'لیست کارهای خود را مدیریت کنید و بهره‌ور بمانید.',
  },
  {
    id: 'settings',
    icon: React.createElement(SettingsIcon),
    title: 'تنظیمات',
    description: 'شخصی‌سازی تایمر تمرکز و هشدارهای سلامتی.',
  },
];
