import { saveImageDataURL } from '../../lib/idb-images';

export type DetailsTab = 'specs' | 'insurance' | 'maintenance' | 'expenses';

export const BASE_EXPENSE_CATEGORIES: string[] = [
  'لوازم یدکی',
  'سرویس',
  'هزینه بنزین',
];

export const BASE_SERVICE_ITEMS: string[] = [
  'تعویض روغن موتور',
  'تعویض فیلتر روغن',
  'تعویض فیلتر هوا',
  'تعویض فیلتر سوخت',
  'تعویض فیلتر کابین',
  'بازرسی ترمزها',
  'تعویض ضدیخ / آب رادیاتور',
];

export function formatDateLabel(iso: string | undefined) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR');
  } catch {
    return iso;
  }
}

export async function fileToImageRef(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const ref = await saveImageDataURL(dataUrl);
        resolve(ref);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function todayIsoDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}
