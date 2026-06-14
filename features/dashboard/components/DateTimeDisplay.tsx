

import React, { useState, useEffect } from 'react';
import moment from 'jalali-moment';
import { CalendarIcon, ClockIcon } from '../../../components/Icons';

export const DateTimeDisplay = (): React.ReactNode => {
    const [dateTime, setDateTime] = useState({ date: '', time: '' });

    useEffect(() => {
        const updateDateTime = () => {
            const now = moment();
            setDateTime({
                date: now.locale('fa').format('dddd، jD jMMMM jYYYY'),
                time: now.locale('fa').format('HH:mm:ss')
            });
        };
        
        updateDateTime(); // Set initial time immediately
        const timerId = setInterval(updateDateTime, 1000);

        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="bg-white/[0.04] rounded-xl p-4 ring-1 ring-white/10 flex items-center justify-center flex-wrap gap-x-6 gap-y-2 h-full">
            <div className="flex items-center text-slate-200 text-lg font-medium">
                <CalendarIcon />
                <span>{dateTime.date}</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-600"></div>
            <div className="flex items-center text-slate-200 text-lg font-medium">
                <ClockIcon className="h-5 w-5 ml-2" />
                <span>{dateTime.time}</span>
            </div>
        </div>
    );
};