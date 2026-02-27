import moment from 'jalali-moment';
import { LedgerEntry } from '../types';
import { getLedgerUnitConfig } from './ledger-units.ts';

export const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString('fa-IR')} تومان`;

export const formatDate = (date: string) => moment(date).locale('fa').format('dddd، jD jMMMM jYYYY');

export const formatLedgerAmount = (entry: LedgerEntry) => {
    const cfg = getLedgerUnitConfig((entry as any).unit);
    const amount = Number(entry.amount) || 0;
    const value =
        cfg.maxDecimals > 0
            ? amount.toLocaleString('fa-IR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: cfg.maxDecimals,
              })
            : amount.toLocaleString('fa-IR');
    return `${value} ${cfg.suffix}`;
};
