import React, { useMemo, useState, useEffect } from 'react';
import moment from 'jalali-moment';

export default function JalaliDatePicker({ value, onChange, id, label }: { value: string; onChange: (iso: string) => void; id: string; label?: string; }): React.ReactNode {
    const m = useMemo(() => moment(value), [value]);
    const isValidDate = m.isValid();
    const [jYear, setJYear] = useState(() => isValidDate ? m.jYear() : moment().jYear());
    const [jMonth, setJMonth] = useState(() => isValidDate ? m.jMonth() : moment().jMonth());
    const [jDay, setJDay] = useState(() => isValidDate ? m.jDate() : moment().jDate());

    useEffect(() => {
        const newMoment = moment(value);
        if (newMoment.isValid()) {
            if (newMoment.jYear() !== jYear) setJYear(newMoment.jYear());
            if (newMoment.jMonth() !== jMonth) setJMonth(newMoment.jMonth());
            if (newMoment.jDate() !== jDay) setJDay(newMoment.jDate());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => moment().jMonth(i).locale('fa').format('jMMMM')), []);
    const daysInSelectedMonth = moment.jDaysInMonth(jYear, jMonth);
    const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);
    const currentJYear = moment().jYear();
    const years = Array.from({ length: 20 }, (_, i) => currentJYear - 10 + i);

    const handlePartChange = (part: 'day' | 'month' | 'year', newValue: number) => {
        let year = jYear;
        let month = jMonth;
        let day = jDay;
        if (part === 'year') year = newValue;
        if (part === 'month') month = newValue;
        if (part === 'day') day = newValue;
        const dim = moment.jDaysInMonth(year, month);
        if (day > dim) day = dim;
        const finalMoment = moment(`${year}/${month + 1}/${day}`, 'jYYYY/jM/jD');
        onChange(finalMoment.toISOString());
    };

    return (
        <div>
            {label && <label htmlFor={`${id}-day`} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
            <div className="grid grid-cols-3 gap-2">
                <select id={`${id}-day`} value={jDay} onChange={(e) => handlePartChange('day', parseInt((e.target as HTMLSelectElement).value, 10))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select id={`${id}-month`} value={jMonth} onChange={(e) => handlePartChange('month', parseInt((e.target as HTMLSelectElement).value, 10))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                    {months.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </select>
                <select id={`${id}-year`} value={jYear} onChange={(e) => handlePartChange('year', parseInt((e.target as HTMLSelectElement).value, 10))} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
    );
}


