import React from 'react';
import { PasswordCategoryInfo } from './types';
import { EmailIcon, BankIcon, GlobeIcon, WalletIcon, ExchangeIcon } from '../../components/Icons';

export const PASSWORD_CATEGORIES: PasswordCategoryInfo[] = [
    { id: 'emails', title: 'ایمیل‌های من', icon: React.createElement(EmailIcon) },
    { id: 'banks', title: 'اطلاعات بانکی', icon: React.createElement(BankIcon) },
    { id: 'accounts', title: 'حساب‌های من', icon: React.createElement(GlobeIcon) },
    { id: 'wallets', title: 'کیف پول‌ها', icon: React.createElement(WalletIcon) },
    { id: 'exchanges', title: 'صرافی‌ها', icon: React.createElement(ExchangeIcon) },
];