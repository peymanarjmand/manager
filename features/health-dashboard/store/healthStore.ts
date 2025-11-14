import { create } from 'zustand';
import { 
  Meal, 
  Medicine, 
  MedicineIntake, 
  BloodPressureReading, 
  WeightRecord, 
  HealthProfile,
  HealthEvent 
} from '../../../types';
import { healthDataService } from '../services/healthDataService';

interface HealthState {
  // Data
  healthProfile: HealthProfile | null;
  meals: Meal[];
  medicines: Medicine[];
  medicineIntakes: MedicineIntake[];
  bloodPressureReadings: BloodPressureReading[];
  weightRecords: WeightRecord[];
  healthEvents: HealthEvent[];
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchAllData: () => Promise<void>;
  
  // Profile Actions
  updateHealthProfile: (profile: HealthProfile) => Promise<void>;
  
  // Meal Actions
  addMeal: (meal: Meal) => Promise<void>;
  updateMeal: (id: string, meal: Partial<Meal>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  getTodaysMeals: () => Meal[];
  getMealsInRange: (startDate: Date, endDate: Date) => Promise<Meal[]>;
  
  // Medicine Actions
  addMedicine: (medicine: Medicine) => Promise<string>;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  recordMedicineIntake: (intake: MedicineIntake) => Promise<void>;
  getMedicineIntakes: (medicineId: string, startDate?: Date, endDate?: Date) => Promise<MedicineIntake[]>;
  
  // Blood Pressure Actions
  addBloodPressureReading: (reading: BloodPressureReading) => Promise<void>;
  deleteBloodPressureReading: (id: string) => Promise<void>;
  getLatestBloodPressure: () => BloodPressureReading | null;
  
  // Weight Actions
  addWeightRecord: (record: WeightRecord) => Promise<void>;
  deleteWeightRecord: (id: string) => Promise<void>;
  getLatestWeight: () => WeightRecord | null;
  
  // Event Actions
  addHealthEvent: (event: HealthEvent) => Promise<string>;
  deleteHealthEvent: (id: string) => Promise<void>;
  getEventsInRange: (startDate: Date, endDate: Date) => HealthEvent[];
  
  // Utility Actions
  clearAllData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  // Initial State
  healthProfile: null,
  meals: [],
  medicines: [],
  medicineIntakes: [],
  bloodPressureReadings: [],
  weightRecords: [],
  healthEvents: [],
  loading: false,
  error: null,

  // Actions
  fetchAllData: async () => {
    try {
      set({ loading: true, error: null });
      
      const [
        profile,
        medicines,
        bpReadings,
        weightRecords,
        events
      ] = await Promise.all([
        healthDataService.getHealthProfile(),
        healthDataService.getMedicines(),
        healthDataService.getBloodPressureReadings(new Date(0), new Date()),
        healthDataService.getWeightRecords(new Date(0), new Date()),
        healthDataService.getHealthEvents(new Date(0), new Date())
      ]);

      // Get today's meals
      const today = new Date();
      const todaysMeals = await healthDataService.getMeals(today);

      set({
        healthProfile: profile,
        meals: todaysMeals,
        medicines: medicines,
        bloodPressureReadings: bpReadings,
        weightRecords: weightRecords,
        healthEvents: events,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
      set({ 
        error: 'خطا در بارگذاری داده‌های سلامتی',
        loading: false 
      });
    }
  },

  // Profile Actions
  updateHealthProfile: async (profile: HealthProfile) => {
    try {
      set({ loading: true });
      await healthDataService.updateHealthProfile(profile);
      set({ 
        healthProfile: profile,
        loading: false 
      });
    } catch (error) {
      console.error('Error updating health profile:', error);
      set({ 
        error: 'خطا در بروزرسانی پروفایل سلامتی',
        loading: false 
      });
    }
  },

  // Meal Actions
  addMeal: async (meal: Meal) => {
    try {
      set({ loading: true });
      await healthDataService.addMeal(meal);
      
      // Refresh today's meals
      const today = new Date();
      const todaysMeals = await healthDataService.getMeals(today);
      
      set({ 
        meals: todaysMeals,
        loading: false 
      });
    } catch (error) {
      console.error('Error adding meal:', error);
      set({ 
        error: 'خطا در افزودن وعده غذایی',
        loading: false 
      });
    }
  },

  updateMeal: async (id: string, meal: Partial<Meal>) => {
    try {
      set({ loading: true });
      await healthDataService.updateMeal(id, meal);
      
      // Refresh today's meals
      const today = new Date();
      const todaysMeals = await healthDataService.getMeals(today);
      
      set({ 
        meals: todaysMeals,
        loading: false 
      });
    } catch (error) {
      console.error('Error updating meal:', error);
      set({ 
        error: 'خطا در بروزرسانی وعده غذایی',
        loading: false 
      });
    }
  },

  deleteMeal: async (id: string) => {
    try {
      set({ loading: true });
      await healthDataService.deleteMeal(id);
      
      // Refresh today's meals
      const today = new Date();
      const todaysMeals = await healthDataService.getMeals(today);
      
      set({ 
        meals: todaysMeals,
        loading: false 
      });
    } catch (error) {
      console.error('Error deleting meal:', error);
      set({ 
        error: 'خطا در حذف وعده غذایی',
        loading: false 
      });
    }
  },

  getTodaysMeals: () => {
    const { meals } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return meals.filter(meal => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      return mealDate.getTime() === today.getTime();
    });
  },

  getMealsInRange: async (startDate: Date, endDate: Date) => {
    return await healthDataService.getMealsInRange(startDate, endDate);
  },

  // Medicine Actions
  addMedicine: async (medicine: Medicine) => {
    try {
      set({ loading: true });
      const id = await healthDataService.addMedicine(medicine);
      const medicines = await healthDataService.getMedicines();
      
      set({ 
        medicines,
        loading: false 
      });
      return id;
    } catch (error) {
      console.error('Error adding medicine:', error);
      set({ 
        error: 'خطا در افزودن دارو',
        loading: false 
      });
      throw error;
    }
  },

  updateMedicine: async (id: string, medicine: Partial<Medicine>) => {
    try {
      set({ loading: true });
      await healthDataService.updateMedicine(id, medicine);
      const medicines = await healthDataService.getMedicines();
      
      set({ 
        medicines,
        loading: false 
      });
    } catch (error) {
      console.error('Error updating medicine:', error);
      set({ 
        error: 'خطا در بروزرسانی دارو',
        loading: false 
      });
    }
  },

  deleteMedicine: async (id: string) => {
    try {
      set({ loading: true });
      await healthDataService.deleteMedicine(id);
      const medicines = await healthDataService.getMedicines();
      
      set({ 
        medicines,
        loading: false 
      });
    } catch (error) {
      console.error('Error deleting medicine:', error);
      set({ 
        error: 'خطا در حذف دارو',
        loading: false 
      });
    }
  },

  recordMedicineIntake: async (intake: MedicineIntake) => {
    try {
      set({ loading: true });
      await healthDataService.recordMedicineIntake(intake);
      const intakes = await healthDataService.getMedicineIntakes(intake.medicineId);
      
      set({ 
        medicineIntakes: intakes,
        loading: false 
      });
    } catch (error) {
      console.error('Error recording medicine intake:', error);
      set({ 
        error: 'خطا در ثبت مصرف دارو',
        loading: false 
      });
    }
  },

  getMedicineIntakes: async (medicineId: string, startDate?: Date, endDate?: Date) => {
    return await healthDataService.getMedicineIntakes(medicineId, startDate, endDate);
  },

  // Blood Pressure Actions
  addBloodPressureReading: async (reading: BloodPressureReading) => {
    try {
      set({ loading: true });
      await healthDataService.addBloodPressureReading(reading);
      const readings = await healthDataService.getBloodPressureReadings(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      );
      
      set({ 
        bloodPressureReadings: readings,
        loading: false 
      });
    } catch (error) {
      console.error('Error adding blood pressure reading:', error);
      set({ 
        error: 'خطا در ثبت فشار خون',
        loading: false 
      });
    }
  },

  deleteBloodPressureReading: async (id: string) => {
    try {
      set({ loading: true });
      await healthDataService.deleteBloodPressureReading(id);
      const readings = await healthDataService.getBloodPressureReadings(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );
      
      set({ 
        bloodPressureReadings: readings,
        loading: false 
      });
    } catch (error) {
      console.error('Error deleting blood pressure reading:', error);
      set({ 
        error: 'خطا در حذف فشار خون',
        loading: false 
      });
    }
  },

  getLatestBloodPressure: () => {
    const { bloodPressureReadings } = get();
    if (!bloodPressureReadings.length) return null;
    
    return bloodPressureReadings
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  },

  // Weight Actions
  addWeightRecord: async (record: WeightRecord) => {
    try {
      set({ loading: true });
      await healthDataService.addWeightRecord(record);
      const records = await healthDataService.getWeightRecords(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      );
      
      set({ 
        weightRecords: records,
        loading: false 
      });
    } catch (error) {
      console.error('Error adding weight record:', error);
      set({ 
        error: 'خطا در ثبت وزن',
        loading: false 
      });
    }
  },

  deleteWeightRecord: async (id: string) => {
    try {
      set({ loading: true });
      await healthDataService.deleteWeightRecord(id);
      const records = await healthDataService.getWeightRecords(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );
      
      set({ 
        weightRecords: records,
        loading: false 
      });
    } catch (error) {
      console.error('Error deleting weight record:', error);
      set({ 
        error: 'خطا در حذف وزن',
        loading: false 
      });
    }
  },

  getLatestWeight: () => {
    const { weightRecords } = get();
    if (!weightRecords.length) return null;
    
    return weightRecords
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  },

  // Event Actions
  addHealthEvent: async (event: HealthEvent) => {
    try {
      set({ loading: true });
      const id = await healthDataService.addHealthEvent(event);
      const events = await healthDataService.getHealthEvents(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      );
      
      set({ 
        healthEvents: events,
        loading: false 
      });
      return id;
    } catch (error) {
      console.error('Error adding health event:', error);
      set({ 
        error: 'خطا در افزودن رویداد',
        loading: false 
      });
      throw error;
    }
  },

  deleteHealthEvent: async (id: string) => {
    try {
      set({ loading: true });
      await healthDataService.deleteHealthEvent(id);
      const events = await healthDataService.getHealthEvents(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );
      
      set({ 
        healthEvents: events,
        loading: false 
      });
    } catch (error) {
      console.error('Error deleting health event:', error);
      set({ 
        error: 'خطا در حذف رویداد',
        loading: false 
      });
    }
  },

  getEventsInRange: (startDate: Date, endDate: Date) => {
    const { healthEvents } = get();
    return healthEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= startDate && eventDate <= endDate;
    });
  },

  // Utility Actions
  clearAllData: async () => {
    try {
      set({ loading: true });
      await healthDataService.clearAllData();
      set({ 
        healthProfile: null,
        meals: [],
        medicines: [],
        medicineIntakes: [],
        bloodPressureReadings: [],
        weightRecords: [],
        healthEvents: [],
        loading: false 
      });
    } catch (error) {
      console.error('Error clearing all data:', error);
      set({ 
        error: 'خطا در پاک‌سازی داده‌ها',
        loading: false 
      });
    }
  },

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error })
}));