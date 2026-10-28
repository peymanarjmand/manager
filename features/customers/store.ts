import { create } from "zustand";
import type {
  Customer,
  Entity,
  LedgerEntry,
  Note,
  Project,
  ServiceRecord,
} from "./types";
import { listEntities } from "../vault/repository";
import { assertContext, context, onVaultLock } from "../vault/session";
interface CustomerState {
  customers: Entity<Customer>[];
  projects: Entity<Project>[];
  records: Entity<ServiceRecord>[];
  ledger: Entity<LedgerEntry>[];
  notes: Entity<Note>[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}
const empty = (): CustomerState => ({
  customers: [],
  projects: [],
  records: [],
  ledger: [],
  notes: [],
  loading: false,
  loaded: false,
  error: null,
});
export const useCustomers = create<CustomerState>(() => empty());
let request = 0;
onVaultLock(() => {
  request++;
  useCustomers.setState(empty());
});
export async function reloadCustomers(): Promise<void> {
  const captured = context(),
    ticket = ++request;
  useCustomers.setState({ loading: true, error: null });
  try {
    const [customers, projects, records, ledger, notes] = await Promise.all([
      listEntities("customer"),
      listEntities("project"),
      listEntities("record"),
      listEntities("ledger"),
      listEntities("note"),
    ]);
    assertContext(captured);
    if (ticket === request)
      useCustomers.setState({
        customers,
        projects,
        records,
        ledger,
        notes,
        loading: false,
        loaded: true,
      });
  } catch (error) {
    if (ticket === request)
      useCustomers.setState({
        loading: false,
        loaded: false,
        error: (error as Error).message,
      });
    throw error;
  }
}
