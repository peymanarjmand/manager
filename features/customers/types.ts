export type EntityKind = "customer" | "project" | "record" | "ledger" | "note";
export const TABLES = {
  customer: "crm_customers",
  project: "crm_projects",
  record: "crm_records",
  ledger: "crm_ledger_entries",
  note: "crm_notes",
} as const;
export interface ContactValue {
  label: string;
  value: string;
}
export interface Customer {
  firstName: string;
  lastName: string;
  mobiles: ContactValue[];
  phones: ContactValue[];
  emails: ContactValue[];
  birthDate?: string;
  nationalId?: string;
  fatherName?: string;
  company?: string;
  address?: string;
  postalCode?: string;
  notes?: string;
}
export interface Project {
  title: string;
  type: "website" | "app" | "other";
  status: "planned" | "active" | "waiting" | "completed";
  startDate?: string;
  dueDate?: string;
  description?: string;
  siteUrl?: string;
  appUrl?: string;
  repository?: string;
  contractAmount?: string;
}
export interface CustomField {
  id: string;
  label: string;
  type: "text" | "multiline" | "url" | "date" | "secret";
  value: string;
}
export interface RecoveryCode {
  id: string;
  value: string;
  used: boolean;
}
export interface ServiceRecord {
  title: string;
  type: string;
  fields: Record<string, string>;
  customFields: CustomField[];
  recoveryCodes: RecoveryCode[];
  projectIds: string[];
  renewalDate?: string;
  renewalCost?: string;
  notes?: string;
}
export type LedgerType =
  | "expense"
  | "charge"
  | "owe"
  | "receipt"
  | "payment"
  | "opening";
export interface LedgerEntry {
  type: LedgerType;
  amount: string;
  title: string;
  description?: string;
  occurredAt: string;
  method?: string;
  reference?: string;
  bankRecordId?: string;
  openingDirection?: "receivable" | "payable";
  voided?: boolean;
}
export interface Note {
  title: string;
  text: string;
}
export interface Payloads {
  customer: Customer;
  project: Project;
  record: ServiceRecord;
  ledger: LedgerEntry;
  note: Note;
}
export interface Entity<T> {
  id: string;
  user_id: string;
  customer_id?: string;
  project_id?: string | null;
  revision: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  data: T;
}
export type Parent = { kind: EntityKind | "password"; id: string };
export interface AttachmentMetadata {
  name: string;
  mime: string;
  size: number;
  sha256: string;
  label: string;
  imageIv: string;
}
