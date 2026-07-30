import * as XLSX from 'xlsx';

export interface ParsedWorkerRow {
  rowNumber: number;
  full_name: string;
  cin: string;
  phone: string;
  job_title: string;
  daily_rate: number | null;
  hourly_rate: number | null;
  wilaya: string;
  availability: string;
  skills: string;
  contract_type: string;
  notes: string;
  errors: string[];
  isValid: boolean;
}

export interface ParsedContractItemRow {
  rowNumber: number;
  item_number: string;
  designation: string;
  unit: string;
  quantity: number | null;
  unit_price: number | null;
  notes: string;
  errors: string[];
  isValid: boolean;
}

export function generateWorkersTemplate(isAr: boolean) {
  const headers = [
    'full_name',
    'cin',
    'phone',
    'job_title',
    'daily_rate',
    'hourly_rate',
    'wilaya',
    'availability',
    'skills',
    'contract_type',
    'notes'
  ];

  const sampleRow = [
    isAr ? 'أحمد منصور' : 'Ahmed Mansouri',
    '123456789',
    '0550123456',
    'Maçon',
    4000,
    500,
    'الجزائر',
    'available',
    isAr ? 'خبرة 5 سنوات في البناء' : '5 ans d\'expérience',
    'daily',
    isAr ? 'عامل ممتاز' : 'Bon ouvrier'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  
  // Set column widths for better UX
  ws['!cols'] = [
    { wch: 20 }, // full_name
    { wch: 15 }, // cin
    { wch: 15 }, // phone
    { wch: 18 }, // job_title
    { wch: 12 }, // daily_rate
    { wch: 12 }, // hourly_rate
    { wch: 15 }, // wilaya
    { wch: 15 }, // availability
    { wch: 25 }, // skills
    { wch: 15 }, // contract_type
    { wch: 20 }, // notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Workers');
  XLSX.writeFile(wb, 'workers_import_template.xlsx');
}

export function generateContractItemsTemplate(isAr: boolean) {
  const headers = [
    'item_number',
    'designation',
    'unit',
    'quantity',
    'unit_price',
    'notes'
  ];

  const sampleRow = [
    '01.01',
    isAr ? 'حفر التراب الصالح للردم' : 'Terrassement en grande masse',
    'm3',
    1500,
    1200,
    isAr ? 'بند تجريبي' : 'Article test'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ContractItems');
  XLSX.writeFile(wb, 'contract_items_import_template.xlsx');
}

export async function parseWorkersExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseContractItemsExcel(file: File): Promise<any[]> {
  return parseWorkersExcel(file);
}
