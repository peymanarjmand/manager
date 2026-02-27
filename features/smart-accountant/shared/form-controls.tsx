import React from 'react';
import { DefaultImageIcon } from '../../../components/Icons';

export const FormInput = ({ label, id, value, onChange, type = 'text', required = false, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={id}
            name={id}
            value={value || ''}
            onChange={onChange}
            required={required}
            className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
            {...props}
        />
    </div>
);

export const FormSelect = ({ label, id, value, onChange, children, required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <select
            id={id}
            name={id}
            value={value || ''}
            onChange={onChange}
            required={required}
            className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition"
        >
            {children}
        </select>
    </div>
);

export const FormTextarea = ({ label, id, value, onChange, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <textarea id={id} name={id} value={value || ''} onChange={onChange} rows={3} className="w-full bg-slate-700/50 text-white rounded-md py-2 px-3 focus:ring-2 focus:ring-sky-400 focus:outline-none transition" {...props} />
    </div>
);

export const FormImageUpload = ({ label, preview, onChange }) => (
     <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <div className="mt-1 flex items-center space-x-4 space-x-reverse">
            <span className="h-20 w-20 rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
                {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <DefaultImageIcon />}
            </span>
            <label htmlFor="file-upload" className="cursor-pointer bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-md hover:bg-slate-600 transition">
                <span>بارگذاری تصویر</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onChange} accept="image/*"/>
            </label>
        </div>
    </div>
);
