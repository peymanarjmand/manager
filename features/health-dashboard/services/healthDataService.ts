import { openDB, IDBPDatabase } from 'idb';
import { 
  Meal, 
  Medicine, 
  MedicineIntake, 
  BloodPressureReading, 
  WeightRecord, 
  HealthProfile,
  HealthEvent 
} from '../../../types';

export interface HealthDataService {
  // Nutrition
  addMeal(meal: Meal): Promise<void>;
  getMeals(date: Date): Promise<Meal[]>;
  getMealsInRange(startDate: Date, endDate: Date): Promise<Meal[]>;
  updateMeal(id: string, meal: Partial<Meal>): Promise<void>;
  deleteMeal(id: string): Promise<void>;
  
  // Medicines
  addMedicine(medicine: Medicine): Promise<string>;
  getMedicines(): Promise<Medicine[]>;
  getActiveMedicines(): Promise<Medicine[]>;
  updateMedicine(id: string, medicine: Partial<Medicine>): Promise<void>;
  deleteMedicine(id: string): Promise<void>;
  recordMedicineIntake(intake: MedicineIntake): Promise<void>;
  getMedicineIntakes(medicineId: string, startDate?: Date, endDate?: Date): Promise<MedicineIntake[]>;
  
  // Blood Pressure
  addBloodPressureReading(reading: BloodPressureReading): Promise<void>;
  getBloodPressureReadings(startDate: Date, endDate: Date): Promise<BloodPressureReading[]>;
  getLatestBloodPressure(): Promise<BloodPressureReading | null>;
  deleteBloodPressureReading(id: string): Promise<void>;
  
  // Weight
  addWeightRecord(record: WeightRecord): Promise<void>;
  getWeightRecords(startDate: Date, endDate: Date): Promise<WeightRecord[]>;
  getLatestWeight(): Promise<WeightRecord | null>;
  deleteWeightRecord(id: string): Promise<void>;
  
  // Health Profile
  updateHealthProfile(profile: HealthProfile): Promise<void>;
  getHealthProfile(): Promise<HealthProfile | null>;
  
  // Health Events
  addHealthEvent(event: HealthEvent): Promise<string>;
  getHealthEvents(startDate: Date, endDate: Date): Promise<HealthEvent[]>;
  deleteHealthEvent(id: string): Promise<void>;
  
  // General
  initializeDB(): Promise<void>;
  clearAllData(): Promise<void>;
}

const DB_CONFIG = {
  name: 'HealthDashboardDB',
  version: 1,
  stores: {
    healthProfile: 'id',
    meals: 'id',
    medicines: 'id',
    medicineIntakes: 'id',
    bloodPressureReadings: 'id',
    weightRecords: 'id',
    healthEvents: 'id'
  }
};

export class IndexedDBHealthDataService implements HealthDataService {
  private db: IDBPDatabase | null = null;

  async initializeDB(): Promise<void> {
    this.db = await openDB(DB_CONFIG.name, DB_CONFIG.version, {
      upgrade(db) {
        // Health Profile Store
        if (!db.objectStoreNames.contains('healthProfile')) {
          const profileStore = db.createObjectStore('healthProfile', { keyPath: 'id' });
          profileStore.createIndex('createdAt', 'createdAt');
        }

        // Meals Store
        if (!db.objectStoreNames.contains('meals')) {
          const mealsStore = db.createObjectStore('meals', { keyPath: 'id' });
          mealsStore.createIndex('date', 'date');
          mealsStore.createIndex('mealType', 'mealType');
        }

        // Medicines Store
        if (!db.objectStoreNames.contains('medicines')) {
          const medicinesStore = db.createObjectStore('medicines', { keyPath: 'id' });
          medicinesStore.createIndex('isActive', 'isActive');
          medicinesStore.createIndex('startDate', 'startDate');
        }

        // Medicine Intakes Store
        if (!db.objectStoreNames.contains('medicineIntakes')) {
          const intakesStore = db.createObjectStore('medicineIntakes', { keyPath: 'id' });
          intakesStore.createIndex('medicineId', 'medicineId');
          intakesStore.createIndex('timestamp', 'timestamp');
        }

        // Blood Pressure Readings Store
        if (!db.objectStoreNames.contains('bloodPressureReadings')) {
          const bpStore = db.createObjectStore('bloodPressureReadings', { keyPath: 'id' });
          bpStore.createIndex('timestamp', 'timestamp');
        }

        // Weight Records Store
        if (!db.objectStoreNames.contains('weightRecords')) {
          const weightStore = db.createObjectStore('weightRecords', { keyPath: 'id' });
          weightStore.createIndex('timestamp', 'timestamp');
        }

        // Health Events Store
        if (!db.objectStoreNames.contains('healthEvents')) {
          const eventsStore = db.createObjectStore('healthEvents', { keyPath: 'id' });
          eventsStore.createIndex('startTime', 'startTime');
          eventsStore.createIndex('type', 'type');
        }
      }
    });
  }

  private async getDB(): Promise<IDBPDatabase> {
    if (!this.db) {
      await this.initializeDB();
    }
    return this.db!;
  }

  // Nutrition Methods
  async addMeal(meal: Meal): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('meals', 'readwrite');
    await tx.store.add({
      ...meal,
      date: meal.date.toISOString()
    });
    await tx.done;
  }

  async getMeals(date: Date): Promise<Meal[]> {
    const db = await this.getDB();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await db.getAllFromIndex('meals', 'date');
    return meals
      .filter(meal => {
        const mealDate = new Date(meal.date);
        return mealDate >= startOfDay && mealDate <= endOfDay;
      })
      .map(meal => ({
        ...meal,
        date: new Date(meal.date)
      }));
  }

  async getMealsInRange(startDate: Date, endDate: Date): Promise<Meal[]> {
    const db = await this.getDB();
    const meals = await db.getAll('meals');
    return meals
      .filter(meal => {
        const mealDate = new Date(meal.date);
        return mealDate >= startDate && mealDate <= endDate;
      })
      .map(meal => ({
        ...meal,
        date: new Date(meal.date)
      }));
  }

  async updateMeal(id: string, meal: Partial<Meal>): Promise<void> {
    const db = await this.getDB();
    const existingMeal = await db.get('meals', id);
    if (existingMeal) {
      const updatedMeal = {
        ...existingMeal,
        ...meal,
        ...(meal.date && { date: meal.date.toISOString() })
      };
      await db.put('meals', updatedMeal);
    }
  }

  async deleteMeal(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('meals', id);
  }

  // Medicine Methods
  async addMedicine(medicine: Medicine): Promise<string> {
    const db = await this.getDB();
    const id = medicine.id || self.crypto.randomUUID();
    const medicineWithId = { ...medicine, id };
    
    const tx = db.transaction('medicines', 'readwrite');
    await tx.store.add(medicineWithId);
    await tx.done;
    
    return id;
  }

  async getMedicines(): Promise<Medicine[]> {
    const db = await this.getDB();
    return await db.getAll('medicines');
  }

  async getActiveMedicines(): Promise<Medicine[]> {
    const db = await this.getDB();
    return await db.getAllFromIndex('medicines', 'isActive', IDBKeyRange.only(true));
  }

  async updateMedicine(id: string, medicine: Partial<Medicine>): Promise<void> {
    const db = await this.getDB();
    const existingMedicine = await db.get('medicines', id);
    if (existingMedicine) {
      const updatedMedicine = {
        ...existingMedicine,
        ...medicine,
        ...(medicine.startDate && { startDate: medicine.startDate.toISOString() }),
        ...(medicine.endDate && { endDate: medicine.endDate.toISOString() })
      };
      await db.put('medicines', updatedMedicine);
    }
  }

  async deleteMedicine(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['medicines', 'medicineIntakes'], 'readwrite');
    await tx.objectStore('medicines').delete(id);
    await tx.objectStore('medicineIntakes').delete(id);
    await tx.done;
  }

  async recordMedicineIntake(intake: MedicineIntake): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('medicineIntakes', 'readwrite');
    await tx.store.add({
      ...intake,
      timestamp: intake.timestamp.toISOString()
    });
    await tx.done;
  }

  async getMedicineIntakes(medicineId: string, startDate?: Date, endDate?: Date): Promise<MedicineIntake[]> {
    const db = await this.getDB();
    const intakes = await db.getAllFromIndex('medicineIntakes', 'medicineId', medicineId);
    
    return intakes
      .filter(intake => {
        const intakeDate = new Date(intake.timestamp);
        if (startDate && intakeDate < startDate) return false;
        if (endDate && intakeDate > endDate) return false;
        return true;
      })
      .map(intake => ({
        ...intake,
        timestamp: new Date(intake.timestamp)
      }));
  }

  // Blood Pressure Methods
  async addBloodPressureReading(reading: BloodPressureReading): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('bloodPressureReadings', 'readwrite');
    await tx.store.add({
      ...reading,
      timestamp: reading.timestamp.toISOString()
    });
    await tx.done;
  }

  async getBloodPressureReadings(startDate: Date, endDate: Date): Promise<BloodPressureReading[]> {
    const db = await this.getDB();
    const readings = await db.getAll('bloodPressureReadings');
    
    return readings
      .filter(reading => {
        const readingDate = new Date(reading.timestamp);
        return readingDate >= startDate && readingDate <= endDate;
      })
      .map(reading => ({
        ...reading,
        timestamp: new Date(reading.timestamp)
      }));
  }

  async getLatestBloodPressure(): Promise<BloodPressureReading | null> {
    const db = await this.getDB();
    const readings = await db.getAll('bloodPressureReadings');
    
    if (readings.length === 0) return null;
    
    const latest = readings
      .map(reading => ({
        ...reading,
        timestamp: new Date(reading.timestamp)
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    return latest;
  }

  async deleteBloodPressureReading(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('bloodPressureReadings', id);
  }

  // Weight Methods
  async addWeightRecord(record: WeightRecord): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('weightRecords', 'readwrite');
    await tx.store.add({
      ...record,
      timestamp: record.timestamp.toISOString()
    });
    await tx.done;
  }

  async getWeightRecords(startDate: Date, endDate: Date): Promise<WeightRecord[]> {
    const db = await this.getDB();
    const records = await db.getAll('weightRecords');
    
    return records
      .filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= startDate && recordDate <= endDate;
      })
      .map(record => ({
        ...record,
        timestamp: new Date(record.timestamp)
      }));
  }

  async getLatestWeight(): Promise<WeightRecord | null> {
    const db = await this.getDB();
    const records = await db.getAll('weightRecords');
    
    if (records.length === 0) return null;
    
    const latest = records
      .map(record => ({
        ...record,
        timestamp: new Date(record.timestamp)
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    return latest;
  }

  async deleteWeightRecord(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('weightRecords', id);
  }

  // Health Profile Methods
  async updateHealthProfile(profile: HealthProfile): Promise<void> {
    const db = await this.getDB();
    const profileWithId = { ...profile, id: 'main-profile' };
    await db.put('healthProfile', profileWithId);
  }

  async getHealthProfile(): Promise<HealthProfile | null> {
    const db = await this.getDB();
    const profile = await db.get('healthProfile', 'main-profile');
    return profile || null;
  }

  // Health Events Methods
  async addHealthEvent(event: HealthEvent): Promise<string> {
    const db = await this.getDB();
    const id = event.id || self.crypto.randomUUID();
    const eventWithId = { ...event, id };
    
    const tx = db.transaction('healthEvents', 'readwrite');
    await tx.store.add({
      ...eventWithId,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime ? event.endTime.toISOString() : undefined
    });
    await tx.done;
    
    return id;
  }

  async getHealthEvents(startDate: Date, endDate: Date): Promise<HealthEvent[]> {
    const db = await this.getDB();
    const events = await db.getAll('healthEvents');
    
    return events
      .filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate >= startDate && eventDate <= endDate;
      })
      .map(event => ({
        ...event,
        startTime: new Date(event.startTime),
        endTime: event.endTime ? new Date(event.endTime) : undefined
      }));
  }

  async deleteHealthEvent(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('healthEvents', id);
  }

  // General Methods
  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(
      ['healthProfile', 'meals', 'medicines', 'medicineIntakes', 
       'bloodPressureReadings', 'weightRecords', 'healthEvents'],
      'readwrite'
    );
    
    await Promise.all([
      tx.objectStore('healthProfile').clear(),
      tx.objectStore('meals').clear(),
      tx.objectStore('medicines').clear(),
      tx.objectStore('medicineIntakes').clear(),
      tx.objectStore('bloodPressureReadings').clear(),
      tx.objectStore('weightRecords').clear(),
      tx.objectStore('healthEvents').clear()
    ]);
    
    await tx.done;
  }
}

// Singleton instance
export const healthDataService = new IndexedDBHealthDataService();
