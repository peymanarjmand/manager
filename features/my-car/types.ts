import { Vehicle, VehicleInsurance, VehicleMaintenanceRecord, VehicleInsuranceType, VehicleExpense } from '../../types';

export type { Vehicle, VehicleInsurance, VehicleMaintenanceRecord, VehicleInsuranceType, VehicleExpense };

export interface MyCarState {
  vehicles: Vehicle[];
  insurances: VehicleInsurance[];
  maintenances: VehicleMaintenanceRecord[];
  expenses: VehicleExpense[];
  selectedVehicleId: string | null;
  loading: boolean;
  error: string | null;

  // Loaders
  loadVehicles: () => Promise<void>;
  loadDetailsForVehicle: (vehicleId: string) => Promise<void>;

  // Vehicle CRUD
  saveVehicle: (vehicle: Omit<Vehicle, 'createdAt'>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  selectVehicle: (id: string | null) => void;

  // Insurance CRUD
  saveInsurance: (insurance: Omit<VehicleInsurance, 'createdAt'>) => Promise<void>;
  deleteInsurance: (id: string) => Promise<void>;

  // Maintenance CRUD
  saveMaintenance: (record: Omit<VehicleMaintenanceRecord, 'createdAt'>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;

  // Expenses CRUD
  saveExpense: (expense: Omit<VehicleExpense, 'createdAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}


