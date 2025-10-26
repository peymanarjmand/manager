import React from 'react';
import { DashboardItem } from '../../types';
import { KeyIcon, CalculatorIcon, PhoneBookIcon, TodoIcon, SettingsIcon, HomeBuildIcon } from '../../components/Icons';

export const DASHBOARD_ITEMS: DashboardItem[] = [
  {
    id: 'password-manager',
    icon: React.createElement(KeyIcon),
    title: 'مدیر رمز عبور',
    description: 'رمزهای عبور خود را به صورت ایمن ذخیره و مدیریت کنید.',
  },
  {
    id: 'darfak',
    icon: React.createElement(HomeBuildIcon),
    title: 'درفک (ساخت‌وساز)',
    description: 'پیگیری هزینه‌های ساخت خانه با تگ‌ها و گزارش‌ها.',
  },
  {
    id: 'smart-accountant',
    icon: React.createElement(CalculatorIcon),
    title: 'حسابدار هوشمند',
    description: 'درآمد و هزینه‌های خود را بدون زحمت پیگیری کنید.',
  },
  {
    id: 'phone-book',
    icon: React.createElement(PhoneBookIcon),
    title: 'دفتر تلفن',
    description: 'مخاطبین خود را به راحتی سازماندهی و به آنها دسترسی پیدا کنید.',
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