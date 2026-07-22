// ═══════════════════════════════════════════════════════════════════
// نظام الكميات المنجزة (Mètres) - Types
// ═══════════════════════════════════════════════════════════════════

// ── بند العقد / Bordereau des Prix Unitaires ──
export interface ContractItem {
  id: string;
  project_id: string;
  item_number: string;            // رقم البند (مثلاً: 1.1, 2.3)
  designation: string;            // وصف البند / بيان الأشغال
  unit: string;                   // وحدة القياس
  quantity: number;               // الكمية الاتفاقية (في العقد)
  unit_price: number;             // السعر الوحدي (BPU)
  total_price: number;            // المبلغ الإجمالي (محسوب تلقائياً)
  notes?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type CreateContractItemDto = Omit<ContractItem, 'id' | 'total_price' | 'created_at' | 'updated_at'>;
export type UpdateContractItemDto = Partial<CreateContractItemDto>;

// ── الكمية المنجزة يومياً / Métré ──
export interface Metre {
  id: string;
  project_id: string;
  daily_log_id?: string | null;
  contract_item_id: string;
  log_date: string;               // YYYY-MM-DD
  achieved_quantity: number;      // الكمية المنجزة
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateMetreDto = Omit<Metre, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMetreDto = Partial<CreateMetreDto>;

// ── نوع مركّب للعرض (بند العقد + إجمالي المنجز) ──
export interface ContractItemWithProgress extends ContractItem {
  total_achieved: number;         // مجموع الكميات المنجزة
  progress_percent: number;       // نسبة الإنجاز %
  achieved_amount: number;        // المبلغ المنجز (unit_price × total_achieved)
  remaining_quantity: number;     // الكمية المتبقية
  metres_count: number;           // عدد التسجيلات
}

// ── ملخص الكمية المنجزة للمشروع ──
export interface MetresSummary {
  total_contract_value: number;   // إجمالي قيمة العقد
  total_achieved_value: number;   // إجمالي القيمة المنجزة
  overall_progress: number;       // نسبة الإنجاز العامة %
  total_items: number;            // عدد البنود
  completed_items: number;        // عدد البنود المكتملة
  total_metres: number;           // عدد تسجيلات الكميات
}
