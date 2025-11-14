import React from 'react';
import { 
  HeartIcon, 
  ClockIcon, 
  CalendarIcon, 
  PlusIcon,
  WeightIcon,
  PillIcon,
  ChartIcon 
} from '../../../components/Icons';
import { WeightRecord, BloodPressureReading, Meal, Medicine, HealthProfile } from '../../../types';

interface HealthCardsProps {
  latestWeight: WeightRecord | null;
  latestBloodPressure: BloodPressureReading | null;
  todaysMeals: Meal[];
  activeMedicines: Medicine[];
  healthProfile: HealthProfile | null;
}

export const HealthCards: React.FC<HealthCardsProps> = ({
  latestWeight,
  latestBloodPressure,
  todaysMeals,
  activeMedicines,
  healthProfile
}) => {
  const calculateBMI = (weight: number, height: number): number => {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'کمبود وزن';
    if (bmi < 25) return 'نرمال';
    if (bmi < 30) return 'اضافه وزن';
    return 'چاقی';
  };

  const getBMIColor = (bmi: number): string => {
    if (bmi < 18.5) return 'text-blue-400';
    if (bmi < 25) return 'text-green-400';
    if (bmi < 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBloodPressureStatus = (systolic: number, diastolic: number): { status: string; color: string } => {
    if (systolic < 120 && diastolic < 80) return { status: 'نرمال', color: 'text-green-400' };
    if (systolic < 130 && diastolic < 80) return { status: 'افزایش یافته', color: 'text-yellow-400' };
    if (systolic < 140 || diastolic < 90) return { status: 'فشار خون بالا - مرحله 1', color: 'text-orange-400' };
    if (systolic < 180 || diastolic < 120) return { status: 'فشار خون بالا - مرحله 2', color: 'text-red-400' };
    return { status: 'بحرانی', color: 'text-red-600' };
  };

  const getTodaysCalories = (): number => {
    return todaysMeals.reduce((sum, meal) => sum + meal.calories, 0);
  };

  const getUpcomingMedicines = (): number => {
    const now = new Date();
    return activeMedicines.filter(medicine => {
      return medicine.times.some(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const medicineTime = new Date(now);
        medicineTime.setHours(hours, minutes, 0, 0);
        return medicineTime > now;
      });
    }).length;
  };

  return (
    <>
      {/* Weight Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 hover:ring-slate-600 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-slate-700/50 p-3 rounded-full">
            <WeightIcon />
          </div>
          <span className="text-xs text-slate-400">آخرین اندازه‌گیری</span>
        </div>
        
        {latestWeight ? (
          <>
            <h3 className="text-2xl font-bold text-slate-100 mb-1">
              {latestWeight.weight} کیلوگرم
            </h3>
            {healthProfile && (
              <>
                <p className={`text-sm font-medium ${getBMIColor(calculateBMI(latestWeight.weight, healthProfile.height))}`}>
                  BMI: {calculateBMI(latestWeight.weight, healthProfile.height).toFixed(1)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {getBMICategory(calculateBMI(latestWeight.weight, healthProfile.height))}
                </p>
              </>
            )}
            <p className="text-xs text-slate-500 mt-2">
              {new Date(latestWeight.timestamp).toLocaleDateString('fa-IR')}
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-3">هنوز وزنی ثبت نشده</p>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center mx-auto">
              <PlusIcon />
              <span className="mr-1">ثبت وزن</span>
            </button>
          </div>
        )}
      </div>

      {/* Blood Pressure Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 hover:ring-slate-600 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-slate-700/50 p-3 rounded-full">
            <HeartIcon />
          </div>
          <span className="text-xs text-slate-400">آخرین اندازه‌گیری</span>
        </div>
        
        {latestBloodPressure ? (
          <>
            <h3 className="text-2xl font-bold text-slate-100 mb-1">
              {latestBloodPressure.systolic}/{latestBloodPressure.diastolic}
            </h3>
            <p className="text-sm text-slate-300 mb-1">
              ضربان قلب: {latestBloodPressure.pulse}
            </p>
            {(() => {
              const status = getBloodPressureStatus(latestBloodPressure.systolic, latestBloodPressure.diastolic);
              return (
                <p className={`text-sm font-medium ${status.color}`}>
                  {status.status}
                </p>
              );
            })()}
            <p className="text-xs text-slate-500 mt-2">
              {new Date(latestBloodPressure.timestamp).toLocaleDateString('fa-IR')}
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-3">هنوز فشار خونی ثبت نشده</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center mx-auto">
              <PlusIcon />
              <span className="mr-1">ثبت فشار خون</span>
            </button>
          </div>
        )}
      </div>

      {/* Nutrition Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 hover:ring-slate-600 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-slate-700/50 p-3 rounded-full">
            <ChartIcon />
          </div>
          <span className="text-xs text-slate-400">امروز</span>
        </div>
        
        <h3 className="text-2xl font-bold text-slate-100 mb-1">
          {getTodaysCalories()} کالری
        </h3>
        <p className="text-sm text-slate-300 mb-2">
          {todaysMeals.length} وعده غذایی
        </p>
        
        {todaysMeals.length > 0 && (
          <div className="space-y-1">
            {todaysMeals.slice(0, 2).map((meal, index) => (
              <div key={index} className="flex justify-between text-xs text-slate-400">
                <span>{meal.name}</span>
                <span>{meal.calories} کالری</span>
              </div>
            ))}
            {todaysMeals.length > 2 && (
              <p className="text-xs text-slate-500 mt-1">
                و {todaysMeals.length - 2} مورد دیگر...
              </p>
            )}
          </div>
        )}
        
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center mt-4 w-full justify-center">
          <PlusIcon />
          <span className="mr-1">افزودن وعده</span>
        </button>
      </div>

      {/* Medicines Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 hover:ring-slate-600 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-slate-700/50 p-3 rounded-full">
            <PillIcon />
          </div>
          <span className="text-xs text-slate-400">داروهای فعال</span>
        </div>
        
        <h3 className="text-2xl font-bold text-slate-100 mb-1">
          {activeMedicines.length}
        </h3>
        <p className="text-sm text-slate-300 mb-2">
          داروی فعال
        </p>
        
        {getUpcomingMedicines() > 0 && (
          <p className="text-sm text-yellow-400 mb-3">
            {getUpcomingMedicines()} دارو برای امروز باقی مانده
          </p>
        )}
        
        {activeMedicines.slice(0, 2).map((medicine, index) => (
          <div key={index} className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>{medicine.name}</span>
            <span>{medicine.times.join(', ')}</span>
          </div>
        ))}
        
        {activeMedicines.length > 2 && (
          <p className="text-xs text-slate-500 mt-1">
            و {activeMedicines.length - 2} مورد دیگر...
          </p>
        )}
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center mt-4 w-full justify-center">
          <PlusIcon />
          <span className="mr-1">افزودن دارو</span>
        </button>
      </div>
    </>
  );
};

// Additional icons for health dashboard
const WeightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
);

const PillIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);