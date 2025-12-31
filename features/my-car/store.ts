import { create } from 'zustand';
import { supabase } from '../../lib/supabase';
import { MyCarState } from './types';
import type { Vehicle, VehicleInsurance, VehicleMaintenanceRecord } from './types';

// Expected Supabase schema (PostgreSQL):
// 
// create table if not exists vehicles (
//   id text primary key,
//   name text not null,
//   brand text,
//   model text,
//   year int,
//   plate_number text,
//   color text,
//   engine_number text,
//   chassis_number text,
//   vin text,
//   image_ref text,
//   created_at timestamptz default now()
// );
//
// create table if not exists vehicle_insurances (
//   id text primary key,
//   vehicle_id text not null references vehicles(id) on delete cascade,
//   type text not null check (type in ('third_party','body')),
//   company text,
//   policy_number text,
//   start_date date not null,
//   end_date date not null,
//   discount_percent numeric,
//   premium_amount numeric,
//   coverage_description text,
//   document_ref text,
//   created_at timestamptz default now()
// );
//
// create table if not exists vehicle_maintenances (
//   id text primary key,
//   vehicle_id text not null references vehicles(id) on delete cascade,
//   service_date date not null,
//   odometer_km numeric,
//   next_odometer_km numeric,
//   items_description text not null,
//   next_service_date date,
//   cost numeric,
//   notes text,
//   invoice_ref text,
//   created_at timestamptz default now()
// );

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID() as string;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useMyCarStore = create<MyCarState>((set, get) => ({
  vehicles: [],
  insurances: [],
  maintenances: [],
  selectedVehicleId: null,
  loading: false,
  error: null,

  async loadVehicles() {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('vehicles')
      .select(
        'id,name,brand,model,year,plate_number,color,engine_number,chassis_number,vin,image_ref,created_at'
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Load vehicles error', error);
      set({ loading: false, error: 'خطا در بارگذاری خودروها' });
      return;
    }

    const vehicles: Vehicle[] =
      (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        brand: row.brand || undefined,
        model: row.model || undefined,
        year: row.year != null ? Number(row.year) : undefined,
        plateNumber: row.plate_number || undefined,
        color: row.color || undefined,
        engineNumber: row.engine_number || undefined,
        chassisNumber: row.chassis_number || undefined,
        vin: row.vin || undefined,
        imageRef: row.image_ref || undefined,
        createdAt: row.created_at || new Date().toISOString(),
      })) ?? [];

    set((state) => ({
      vehicles,
      loading: false,
      selectedVehicleId: state.selectedVehicleId || (vehicles[0]?.id ?? null),
    }));
  },

  async loadDetailsForVehicle(vehicleId: string) {
    set({ loading: true, error: null });
    const [insRes, maintRes] = await Promise.all([
      supabase
        .from('vehicle_insurances')
        .select(
          'id,vehicle_id,type,company,policy_number,start_date,end_date,discount_percent,premium_amount,coverage_description,document_ref,created_at'
        )
        .eq('vehicle_id', vehicleId)
        .order('start_date', { ascending: false }),
      supabase
        .from('vehicle_maintenances')
        .select(
          'id,vehicle_id,service_date,odometer_km,next_odometer_km,items_description,next_service_date,cost,notes,invoice_ref,created_at'
        )
        .eq('vehicle_id', vehicleId)
        .order('service_date', { ascending: false }),
    ]);

    if (insRes.error || maintRes.error) {
      console.error('Load vehicle details error', insRes.error || maintRes.error);
      set({ loading: false, error: 'خطا در بارگذاری جزئیات خودرو' });
      return;
    }

    const insurances: VehicleInsurance[] =
      (insRes.data || []).map((row: any) => ({
        id: row.id,
        vehicleId: row.vehicle_id,
        type: row.type,
        company: row.company || undefined,
        policyNumber: row.policy_number || undefined,
        startDate: row.start_date,
        endDate: row.end_date,
        discountPercent:
          row.discount_percent != null ? Number(row.discount_percent) : undefined,
        premiumAmount:
          row.premium_amount != null ? Number(row.premium_amount) : undefined,
        coverageDescription: row.coverage_description || undefined,
        documentRef: row.document_ref || undefined,
        createdAt: row.created_at || new Date().toISOString(),
      })) ?? [];

    const maintenances: VehicleMaintenanceRecord[] =
      (maintRes.data || []).map((row: any) => ({
        id: row.id,
        vehicleId: row.vehicle_id,
        serviceDate: row.service_date,
        odometerKm:
          row.odometer_km != null ? Number(row.odometer_km) : undefined,
        nextOdometerKm:
          row.next_odometer_km != null ? Number(row.next_odometer_km) : undefined,
        itemsDescription: row.items_description,
        nextServiceDate: row.next_service_date || undefined,
        cost: row.cost != null ? Number(row.cost) : undefined,
        notes: row.notes || undefined,
        invoiceRef: row.invoice_ref || undefined,
        createdAt: row.created_at || new Date().toISOString(),
      })) ?? [];

    set({
      insurances,
      maintenances,
      selectedVehicleId: vehicleId,
      loading: false,
    });
  },

  async saveVehicle(vehicleInput) {
    const id = vehicleInput.id || genId();
    const vehicleToSave: Vehicle = {
      ...vehicleInput,
      id,
      createdAt: vehicleInput.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('vehicles').upsert({
      id: vehicleToSave.id,
      name: vehicleToSave.name,
      brand: vehicleToSave.brand || null,
      model: vehicleToSave.model || null,
      year: vehicleToSave.year ?? null,
      plate_number: vehicleToSave.plateNumber || null,
      color: vehicleToSave.color || null,
      engine_number: vehicleToSave.engineNumber || null,
      chassis_number: vehicleToSave.chassisNumber || null,
      vin: vehicleToSave.vin || null,
      image_ref: vehicleToSave.imageRef || null,
      created_at: vehicleToSave.createdAt,
    });

    if (error) {
      console.error('Save vehicle error', error);
      set({ error: 'خطا در ذخیره خودرو' });
      return;
    }

    set((state) => {
      const others = state.vehicles.filter((v) => v.id !== id);
      return {
        vehicles: [...others, vehicleToSave].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt)
        ),
        selectedVehicleId: id,
      };
    });
  },

  async deleteVehicle(id) {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      console.error('Delete vehicle error', error);
      set({ error: 'خطا در حذف خودرو' });
      return;
    }

    set((state) => {
      const vehicles = state.vehicles.filter((v) => v.id !== id);
      const selectedVehicleId =
        state.selectedVehicleId === id
          ? vehicles[0]?.id ?? null
          : state.selectedVehicleId;
      return {
        vehicles,
        selectedVehicleId,
        insurances:
          selectedVehicleId === null
            ? []
            : state.insurances.filter((i) => i.vehicleId === selectedVehicleId),
        maintenances:
          selectedVehicleId === null
            ? []
            : state.maintenances.filter(
                (m) => m.vehicleId === selectedVehicleId
              ),
      };
    });
  },

  selectVehicle(id) {
    set({ selectedVehicleId: id });
  },

  async saveInsurance(insuranceInput) {
    const id = insuranceInput.id || genId();
    const insurance: VehicleInsurance = {
      ...insuranceInput,
      id,
      createdAt: insuranceInput.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('vehicle_insurances').upsert({
      id: insurance.id,
      vehicle_id: insurance.vehicleId,
      type: insurance.type,
      company: insurance.company || null,
      policy_number: insurance.policyNumber || null,
      start_date: insurance.startDate,
      end_date: insurance.endDate,
      discount_percent: insurance.discountPercent ?? null,
      premium_amount: insurance.premiumAmount ?? null,
      coverage_description: insurance.coverageDescription || null,
      document_ref: insurance.documentRef || null,
      created_at: insurance.createdAt,
    });

    if (error) {
      console.error('Save insurance error', error);
      set({ error: 'خطا در ذخیره بیمه' });
      return;
    }

    set((state) => {
      const others = state.insurances.filter((i) => i.id !== id);
      return {
        insurances: [...others, insurance].sort((a, b) =>
          b.startDate.localeCompare(a.startDate)
        ),
      };
    });
  },

  async deleteInsurance(id) {
    const { error } = await supabase.from('vehicle_insurances').delete().eq('id', id);
    if (error) {
      console.error('Delete insurance error', error);
      set({ error: 'خطا در حذف بیمه' });
      return;
    }

    set((state) => ({
      insurances: state.insurances.filter((i) => i.id !== id),
    }));
  },

  async saveMaintenance(input) {
    const id = input.id || genId();
    const record: VehicleMaintenanceRecord = {
      ...input,
      id,
      createdAt: input.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('vehicle_maintenances').upsert({
      id: record.id,
      vehicle_id: record.vehicleId,
      service_date: record.serviceDate,
      odometer_km: record.odometerKm ?? null,
      next_odometer_km: record.nextOdometerKm ?? null,
      items_description: record.itemsDescription,
      next_service_date: record.nextServiceDate || null,
      cost: record.cost ?? null,
      notes: record.notes || null,
      invoice_ref: record.invoiceRef || null,
      created_at: record.createdAt,
    });

    if (error) {
      console.error('Save maintenance error', error);
      set({ error: 'خطا در ذخیره سرویس فنی' });
      return;
    }

    set((state) => {
      const others = state.maintenances.filter((m) => m.id !== id);
      return {
        maintenances: [...others, record].sort((a, b) =>
          b.serviceDate.localeCompare(a.serviceDate)
        ),
      };
    });
  },

  async deleteMaintenance(id) {
    const { error } = await supabase
      .from('vehicle_maintenances')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Delete maintenance error', error);
      set({ error: 'خطا در حذف سرویس فنی' });
      return;
    }

    set((state) => ({
      maintenances: state.maintenances.filter((m) => m.id !== id),
    }));
  },
}));


