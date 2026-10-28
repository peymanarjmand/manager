import React from 'react';
import { DashboardItem } from '../../types';
import { KeyIcon, CalculatorIcon, PhoneBookIcon, TodoIcon, SettingsIcon, AssetsIcon, HeartIcon, CarIcon } from '../../components/Icons';

import { BriefcaseBusiness } from 'lucide-react';

// Fixed snapshot of the saved Supabase order; never rehydrated from the network.
export const DASHBOARD_ITEMS: DashboardItem[] = [
  {
    id: 'my-car',
    icon: React.createElement(CarIcon),
    title: 'خودروی من',
    description: 'مدیریت مشخصات خودرو، بیمه‌ها و سوابق فنی به‌صورت یکجا.',
  },
  {
    id: 'smart-accountant',
    icon: React.createElement(CalculatorIcon),
    title: 'حسابدار هوشمند',
    description: 'درآمد و هزینه‌های خود را بدون زحمت پیگیری کنید.',
  },
  {
    id: 'customers',
    icon: React.createElement(BriefcaseBusiness),
    title: 'مشتریان',
    description: 'پرونده، پروژه‌ها، حساب‌ها و دفتر مالی مشتریان در خزانهٔ امن.',
  },
  {
    id: 'daily-tasks',
    icon: React.createElement(TodoIcon),
    title: 'کارهای روزانه',
    description: 'لیست کارهای خود را مدیریت کنید و بهره‌ور بمانید.',
  },
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
    id: 'settings',
    icon: React.createElement(SettingsIcon),
    title: 'تنظیمات',
    description: 'شخصی‌سازی تایمر تمرکز و هشدارهای سلامتی.',
  },
  {
    id: 'phone-book',
    icon: React.createElement(PhoneBookIcon),
    title: 'دفترتلفن',
    description: 'مخاطبین و شماره‌ها را مدیریت کنید.',
  },
];
