import React, { useState, useEffect } from 'react';
import { BackIcon, HeartIcon, PlusIcon, CalendarIcon, ClockIcon } from '../../components/Icons';
import { HealthDataService } from './services/healthDataService';
import { HealthCards } from './components/HealthCards';
import { ChartContainer } from './components/ChartContainer';
import { NotificationBadge } from './components/NotificationBadge';
import { QuickActions } from './components/QuickActions';
import { useHealthStore } from './store/healthStore';
import { MedicalRecords } from '../medical-records';
import { FileText, Heart, Pill, TrendingUp } from 'lucide-react';
import { WeightEntryModal } from './components/WeightEntryModal';
import { BloodPressureEntryModal } from './components/BloodPressureEntryModal';
import { MedicineEntryModal } from './components/MedicineEntryModal';
import { MealEntryModal } from './components/MealEntryModal';

interface HealthDashboardProps {
  onNavigateBack: () => void;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ onNavigateBack }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records'>('dashboard');
  const [activeModal, setActiveModal] = useState<'weight' | 'blood-pressure' | 'medicine' | 'meal' | null>(null);
  const { 
    healthProfile, 
    weightRecords, 
    bloodPressureReadings, 
    medicines, 
    meals,
    fetchAllData,
    addWeightRecord,
    addBloodPressureReading,
    addMedicine,
    addMeal
  } = useHealthStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await fetchAllData();
      } catch (error) {
        console.error('Error loading health data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchAllData]);

  const getLatestWeight = () => {
    if (!weightRecords.length) return null;
    return weightRecords.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  };

  const getLatestBloodPressure = () => {
    if (!bloodPressureReadings.length) return null;
    return bloodPressureReadings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  };

  const getTodaysMeals = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return meals.filter(meal => meal.date >= today);
  };

  const getActiveMedicines = () => {
    return medicines.filter(medicine => medicine.isActive);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onNavigateBack}
              className="ml-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <BackIcon />
            </button>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center">
              <HeartIcon />
              <span className="mr-3">داشبورد سلامتی</span>
            </h1>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-slate-400">در حال بارگذاری...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onNavigateBack}
            className="ml-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <BackIcon />
          </button>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <HeartIcon />
            <span className="mr-3">داشبورد سلامتی</span>
          </h1>
          <div className="mr-auto flex items-center space-x-4">
            <NotificationBadge count={getActiveMedicines().length} />
            <div className="text-sm text-slate-400 flex items-center">
              <CalendarIcon className="ml-1" />
              {new Date().toLocaleDateString('fa-IR')}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-slate-800/50 p-1 rounded-lg ring-1 ring-slate-700">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Heart className="w-4 h-4 ml-2" />
            داشبورد سلامتی
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
              activeTab === 'records'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-4 h-4 ml-2" />
            پرونده‌های پزشکی
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <HealthCards
                latestWeight={getLatestWeight()}
                latestBloodPressure={getLatestBloodPressure()}
                todaysMeals={getTodaysMeals()}
                activeMedicines={getActiveMedicines()}
                healthProfile={healthProfile}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {weightRecords && weightRecords.length > 0 && (
                <ChartContainer
                  title="نمودار وزن"
                  data={weightRecords}
                  type="weight"
                  color="#10B981"
                  healthProfile={healthProfile}
                />
              )}
              {bloodPressureReadings && bloodPressureReadings.length > 0 && (
                <ChartContainer
                  title="نمودار فشار خون"
                  data={bloodPressureReadings}
                  type="blood-pressure"
                  color="#3B82F6"
                  healthProfile={healthProfile}
                />
              )}
            </div>

            {/* Quick Actions */}
            <QuickActions 
              onWeightClick={() => setActiveModal('weight')}
              onBloodPressureClick={() => setActiveModal('blood-pressure')}
              onMedicineClick={() => setActiveModal('medicine')}
              onMealClick={() => setActiveModal('meal')}
              onReportsClick={() => console.log('View reports clicked')}
              onCalendarClick={() => console.log('Health calendar clicked')}
            />

            {/* Today's Summary */}
            <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
              <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
                <ClockIcon className="ml-2" />
                خلاصه امروز
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">وعده‌های غذایی</h3>
                  <p className="text-2xl font-bold text-emerald-400">{getTodaysMeals().length}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {getTodaysMeals().reduce((sum, meal) => sum + meal.calories, 0)} کالری
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">داروها</h3>
                  <p className="text-2xl font-bold text-blue-400">{getActiveMedicines().length}</p>
                  <p className="text-xs text-slate-400 mt-1">داروی فعال</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">وضعیت وزن</h3>
                  {getLatestWeight() ? (
                    <>
                      <p className="text-2xl font-bold text-purple-400">
                        {getLatestWeight()?.weight} کیلوگرم
                      </p>
                      {healthProfile && (
                        <p className="text-xs text-slate-400 mt-1">
                          BMI: {calculateBMI(getLatestWeight()!.weight, healthProfile.height)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">هنوز ثبت نشده</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'records' && (
          <MedicalRecords onNavigateBack={() => setActiveTab('dashboard')} />
        )}
      </div>

      {/* Modal Components */}
      {activeModal === 'weight' && (
        <WeightEntryModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSubmit={async (data) => {
            try {
              await addWeightRecord(data);
              setActiveModal(null);
              // Refresh data after submission
              await fetchAllData();
            } catch (error) {
              console.error('Error adding weight record:', error);
            }
          }}
        />
      )}

      {activeModal === 'blood-pressure' && (
        <BloodPressureEntryModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSubmit={async (data) => {
            try {
              await addBloodPressureReading(data);
              setActiveModal(null);
              // Refresh data after submission
              await fetchAllData();
            } catch (error) {
              console.error('Error adding blood pressure reading:', error);
            }
          }}
        />
      )}

      {activeModal === 'medicine' && (
        <MedicineEntryModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSubmit={async (data) => {
            try {
              await addMedicine(data);
              setActiveModal(null);
              // Refresh data after submission
              await fetchAllData();
            } catch (error) {
              console.error('Error adding medicine:', error);
            }
          }}
        />
      )}

      {activeModal === 'meal' && (
        <MealEntryModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSubmit={async (data) => {
            try {
              await addMeal(data);
              setActiveModal(null);
              // Refresh data after submission
              await fetchAllData();
            } catch (error) {
              console.error('Error adding meal:', error);
            }
          }}
        />
      )}
    </div>
  );
};

const calculateBMI = (weight: number, height: number): string => {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return bmi.toFixed(1);
};
