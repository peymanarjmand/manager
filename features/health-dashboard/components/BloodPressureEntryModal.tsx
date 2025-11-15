import React, { useState } from 'react';
import { XIcon } from '../../../components/Icons';
import { BloodPressureReading } from '../../../types';

interface BloodPressureEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BloodPressureReading) => Promise<void>;
}

export const BloodPressureEntryModal: React.FC<BloodPressureEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!systolic || !diastolic) {
      setError('لطفاً فشار خون سیستولیک و دیاستولیک را وارد کنید');
      return;
    }

    const systolicValue = parseInt(systolic);
    const diastolicValue = parseInt(diastolic);

    if (systolicValue <= 0 || diastolicValue <= 0) {
      setError('مقادیر فشار خون باید بیشتر از صفر باشند');
      return;
    }

    if (systolicValue > 300 || diastolicValue > 200) {
      setError('مقادیر فشار خون بیش از حد مجاز است');
      return;
    }

    if (systolicValue < diastolicValue) {
      setError('فشار خون سیستولیک باید بیشتر از دیاستولیک باشد');
      return;
    }

    if (heartRate && (parseInt(heartRate) <= 0 || parseInt(heartRate) > 300)) {
      setError('ضربان قلب باید بین 1 تا 300 باشد');
      return;
    }

    setLoading(true);
    try {
      const timestamp = new Date(`${date}T${time}`);
      const bloodPressureReading: BloodPressureReading = {
        id: `bp-${Date.now()}`,
        systolic: systolicValue,
        diastolic: diastolicValue,
        pulse: heartRate ? parseInt(heartRate) : 0,
        timestamp,
        notes: notes.trim() || undefined
      };
      await onSubmit(bloodPressureReading);
      // Reset form
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
      setNotes('');
    } catch (err) {
      setError('خطا در ثبت فشار خون. لطفاً دوباره تلاش کنید.');
      console.error('Error submitting blood pressure:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md ring-1 ring-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">ثبت فشار خون جدید</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                فشار خون سیستولیک (mmHg)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="مثال: 120"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                فشار خون دیاستولیک (mmHg)
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="مثال: 80"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ضربان قلب (اختیاری - bpm)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="مثال: 72"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                تاریخ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                زمان
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              یادداشت (اختیاری)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="یادداشت درباره فشار خون..."
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'در حال ثبت...' : 'ثبت فشار خون'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};