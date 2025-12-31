import { Vehicle, VehicleInsurance, VehicleMaintenanceRecord, VehicleInsuranceType } from '../../types';

export type { Vehicle, VehicleInsurance, VehicleMaintenanceRecord, VehicleInsuranceType };

export interface MyCarState {
  vehicles: Vehicle[];
  insurances: VehicleInsurance[];
  maintenances: VehicleMaintenanceRecord[];
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
}


