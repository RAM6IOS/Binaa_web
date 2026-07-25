// ═══════════════════════════════════════════════════════════════════
// نظام تتبع المواد (Materials Inventory) - Types
// ═══════════════════════════════════════════════════════════════════

// ── مادة / Material ──
export interface Material {
  id: string;
  project_id: string;
  name: string;                    // اسم المادة
  unit: string;                    // الوحدة: kgs, tonnes, m3, m, piece, other
  initial_quantity: number;        // الكمية الأولية / المتوفرة
  unit_price: number;              // السعر الوحدوي
  notes?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateMaterialDto = Omit<Material, 'id' | 'created_at' | 'updated_at'>;
export type UpdateMaterialDto = Partial<CreateMaterialDto>;

// ── استهلاك مادة / Material Consumption ──
export interface MaterialConsumption {
  id: string;
  project_id: string;
  material_id: string;
  daily_log_id?: string | null;
  quantity: number;                // الكمية المستهلكة
  consumed_at: string;            // YYYY-MM-DD
  notes?: string;
  created_by: string;
  created_at?: string;
}

export type CreateConsumptionDto = Omit<MaterialConsumption, 'id' | 'created_at'>;

// ── نوع مركّب للعرض (مادة + إحصائيات الاستهلاك) ──
export interface MaterialWithStats extends Material {
  total_consumed: number;          // إجمالي الكمية المستهلكة
  remaining_quantity: number;      // الكمية المتبقية
  consumptions_count: number;      // عدد تسجيلات الاستهلاك
}

// ── ملخص المواد للمشروع ──
export interface MaterialsSummary {
  total_materials: number;         // عدد المواد الكلي
  total_initial_value: number;     // إجمالي قيمة المواد الأولية
  total_consumed_value: number;    // إجمالي قيمة الاستهلاك
  total_remaining_value: number;   // إجمالي القيمة المتبقية
}

// ── وحدات القياس المدعومة ──
export const MATERIAL_UNITS = ["kgs", "tonnes", "m3", "m", "piece", "other"] as const;
export type MaterialUnit = typeof MATERIAL_UNITS[number];
