import React, { useState } from 'react';
import { PlusIcon, EditIcon, DeleteIcon, ClockIcon } from '../../../components/Icons';
import { Meal } from '../../../types';
import { useHealthStore } from '../store/healthStore';

interface NutritionTrackerProps {
  onNavigateBack: () => void;
}

export const NutritionTracker: React.FC<NutritionTrackerProps> = ({ onNavigateBack }) => {
  const { meals, addMeal, deleteMeal, loading } = useHealthStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [newMeal, setNewMeal] = useState<Omit<Meal, 'id' | 'date'>>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    mealType: 'lunch',
    notes: ''
  });

  const getMealsForDate = (date: string) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return meals.filter(meal => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      return mealDate.getTime() === targetDate.getTime();
    });
  };

  const getMealTypeLabel = (type: string) => {
    const labels = {
      breakfast: 'صبحانه',
      lunch: 'ناهار',
      dinner: 'شام',
      snack: 'میان‌وعده'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getMealTypeColor = (type: string) => {
    const colors = {
      breakfast: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      lunch: 'bg-green-500/20 text-green-400 border-green-500/30',
      dinner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      snack: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[type as keyof typeof colors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const handleAddMeal = async () => {
    if (!newMeal.name || newMeal.calories <= 0) {
      alert('لطفاً نام غذا و کالری را وارد کنید');
      return;
    }

    try {
      const meal: Meal = {
        ...newMeal,
        id: self.crypto.randomUUID(),
        date: new Date(selectedDate)
      };
      
      await addMeal(meal);
      
      // Reset form
      setNewMeal({
        name: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        mealType: 'lunch',
        notes: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding meal:', error);
      alert('خطا در افزودن وعده غذایی');
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (confirm('آیا از حذف این وعده غذایی اطمینان دارید؟')) {
      try {
        await deleteMeal(mealId);
      } catch (error) {
        console.error('Error deleting meal:', error);
        alert('خطا در حذف وعده غذایی');
      }
    }
  };

  const getDailyTotals = (mealsForDate: Meal[]) => {
    return mealsForDate.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.calories,
        protein: totals.protein + meal.protein,
        carbs: totals.carbs + meal.carbs,
        fat: totals.fat + meal.fat
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const todaysMeals = getMealsForDate(selectedDate);
  const dailyTotals = getDailyTotals(todaysMeals);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={onNavigateBack}
            className="ml-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <span className="mr-3">ترکر تغذیه</span>
          </h1>
        </div>

        {/* Date Selector */}
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-100">انتخاب تاریخ</h2>
            <ClockIcon />
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Daily Summary */}
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">خلاصه روزانه</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{dailyTotals.calories}</p>
              <p className="text-sm text-slate-400">کالری</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{dailyTotals.protein}g</p>
              <p className="text-sm text-slate-400">پروتئین</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-400">{dailyTotals.carbs}g</p>
              <p className="text-sm text-slate-400">کربوهیدرات</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{dailyTotals.fat}g</p>
              <p className="text-sm text-slate-400">چربی</p>
            </div>
          </div>
        </div>

        {/* Add Meal Form */}
        {showAddForm && (
          <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 mb-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">افزودن وعده غذایی</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">نام غذا</label>
                <input
                  type="text"
                  value={newMeal.name}
                  onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="مثلا: سالاد فصل"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">نوع وعده</label>
                <select
                  value={newMeal.mealType}
                  onChange={(e) => setNewMeal({ ...newMeal, mealType: e.target.value as any })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="breakfast">صبحانه</option>
                  <option value="lunch">ناهار</option>
                  <option value="dinner">شام</option>
                  <option value="snack">میان‌وعده</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">کالری</label>
                <input
                  type="number"
                  value={newMeal.calories}
                  onChange={(e) => setNewMeal({ ...newMeal, calories: Number(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">زمان</label>
                <input
                  type="time"
                  value={newMeal.time}
                  onChange={(e) => setNewMeal({ ...newMeal, time: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">پروتئین (گرم)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMeal.protein}
                  onChange={(e) => setNewMeal({ ...newMeal, protein: Number(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">کربوهیدرات (گرم)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMeal.carbs}
                  onChange={(e) => setNewMeal({ ...newMeal, carbs: Number(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">چربی (گرم)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMeal.fat}
                  onChange={(e) => setNewMeal({ ...newMeal, fat: Number(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">یادداشت</label>
                <textarea
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                  placeholder="یادداشت اختیاری..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleAddMeal}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    <span className="mr-1">ثبت وعده</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Meals List */}
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-100">وعده‌های غذایی</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <PlusIcon />
              <span className="mr-1">افزودن وعده</span>
            </button>
          </div>

          {todaysMeals.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-slate-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ClockIcon />
              </div>
              <p className="text-slate-400">هنوز وعده غذایی برای این تاریخ ثبت نشده</p>
              <p className="text-slate-500 text-sm mt-1">با زدن دکمه "افزودن وعده" شروع کنید</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysMeals.map((meal) => (
                <div key={meal.id} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-slate-100">{meal.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getMealTypeColor(meal.mealType)}`}>
                          {getMealTypeLabel(meal.mealType)}
                        </span>
                        <span className="text-sm text-slate-400">{meal.time}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-400">کالری:</span>
                          <span className="text-emerald-400 font-medium mr-1">{meal.calories}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">پروتئین:</span>
                          <span className="text-blue-400 font-medium mr-1">{meal.protein}g</span>
                        </div>
                        <div>
                          <span className="text-slate-400">کربوهیدرات:</span>
                          <span className="text-yellow-400 font-medium mr-1">{meal.carbs}g</span>
                        </div>
                        <div>
                          <span className="text-slate-400">چربی:</span>
                          <span className="text-purple-400 font-medium mr-1">{meal.fat}g</span>
                        </div>
                      </div>
                      
                      {meal.notes && (
                        <p className="text-xs text-slate-400 mt-2">{meal.notes}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};