// src/lib/types/daily-logs.ts

import { Attachment } from '../services/attachments-service';

export type WeatherCondition = 'sunny' | 'rainy' | 'cloudy' | 'stormy' | 'windy' | 'foggy';

// ── القوى العاملة ──
export interface DailyLogWorker {
  worker_id: string;
  worker_name: string;
  job_title?: string;
  hours_worked: number;
  status?: 'present' | 'absent' | 'half_day' | 'overtime';
}

// ── المعدات والعتاد ──
export interface DailyLogEquipment {
  equipment_id: string;
  equipment_name: string;
  usage_hours: number;
}

// ── التوثيق البصري ──
export interface DailyLogPhoto {
  url: string;
  caption?: string;
}

// ── قياس الكميات (Métré) ──
export interface DailyLogQuantity {
  id?: string;
  description: string;           // مثال: "صب الخرسانة للأساسات"
  unit: string;                  // m³, m², ml, kg, ...
  planned_quantity?: number;
  achieved_quantity: number;     // الكمية المنجزة فعلياً
  bpu_item?: string;             // رقم البند من Bordereau
  unit_price?: number;           // السعر الوحدي
}

// ── استهلاك المواد ──
export interface DailyLogMaterial {
  id?: string;
  material_name: string;         // إسمنت، حديد T8، مازوت...
  quantity: number;
  unit: string;                  // kg, t, litre, m³
  notes?: string;
}

// ── النوع الرئيسي للتقرير اليومي (وضعية الأشغال المتكاملة) ──
export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;              // YYYY-MM-DD
  weather_condition: WeatherCondition;
  temperature: number;           // بالدرجة المئوية
  work_summary: string;
  problems_faced?: string;
  notes?: string;
  overall_progress: number;      // نسبة الإنجاز (%)

  // ── الحقول المضافة للتحويل إلى Situation des Travaux ──
  status: 'draft' | 'pending' | 'validated'; // حالة التقرير (مسودة، مراجعة، معتمد)
  location_details?: string;                // المكان (النقطة الكيلومترية، الطابق، الجناح)
  estimated_value: number;                  // القيمة المالية التقديرية للإنجاز اليومي بالدينار الجزائري

  // ── المصفوفات (تخزن كـ JSONB في قاعدة البيانات) ──
  workers_present: DailyLogWorker[];
  equipment_used: DailyLogEquipment[];
  quantities: DailyLogQuantity[];
  materials: DailyLogMaterial[];
  photos: DailyLogPhoto[];

  attachments?: Attachment[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ── DTOs العمليات ──
export type CreateDailyLogDto = Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>;
export type UpdateDailyLogDto = Partial<CreateDailyLogDto>;

// ── نظام البوانتاج (اختياري/مستقل) ──
export interface PointageWorker {
  id?: string;
  pointage_id?: string;
  worker_id: string;
  worker_name?: string;
  job_title?: string;
  status: 'present' | 'absent' | 'half_day' | 'overtime';
  check_in_time?: string | null;
  check_out_time?: string | null;
  break_duration_minutes: number;
  hours_worked: number;
  worker?: {
    full_name: string;
    job_title: string;
  };
}

// ── استمارة البوانتاج (Pointage) ──
export interface Pointage {
  id: string;
  project_id: string;
  pointage_date: string;
  notes?: string;
  equipment_used: DailyLogEquipment[];
  photos: DailyLogPhoto[];
  pointage_workers: PointageWorker[]; // المصفوفة الخاصة بالعمال وأوقاتهم
  attachments?: Attachment[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ── السطر المطلوب لحل المشكلة (CreatePointageDto) ──
export type CreatePointageDto = Omit<Pointage, 'id' | 'created_at' | 'updated_at' | 'pointage_workers'> & {
  id?: string;
  pointage_workers: Omit<PointageWorker, 'id' | 'pointage_id'>[];
};

// ── سطر إضافي تحتاجه لعملية التحديث ──
export type UpdatePointageDto = Partial<CreatePointageDto>;