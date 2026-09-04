// ═══════════════════════════════════════════════════════════════════
// نظام أوامر الطلب (Bons de Commande) - Types
// ═══════════════════════════════════════════════════════════════════

// ── حالة أمر الطلب ──
export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

// ── قواعد الانتقال بين الحالات (مصدر واحد بين الواجهة والخدمة) ──
// draft: تعديل كامل | sent/partial: تغيير حالة فقط | received/cancelled: نهائية (قراءة فقط)
export const LOCKED_STATUSES: PurchaseOrderStatus[] = ['received', 'cancelled'];

export const ALLOWED_STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ['sent', 'partial', 'received', 'cancelled'],
  sent: ['partial', 'received', 'cancelled'],
  partial: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

export const canChangeStatus = (from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean =>
  ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;

// ── رأس أمر الطلب / Bon de Commande ──
export interface PurchaseOrder {
  id: string;
  project_id: string;
  number: string;
  order_date: string;              // YYYY-MM-DD
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_address?: string | null;
  expected_delivery_date?: string | null;
  status: PurchaseOrderStatus;
  notes?: string | null;
  total_ht: number;
  tva_rate?: number | null;
  total_tva?: number | null;
  total_ttc?: number | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── بند أمر الطلب / Article ──
export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  project_id: string;
  material_id?: string | null;
  designation: string;
  unit: string;
  quantity: number;
  unit_price_ht: number;
  amount_ht: number;
  notes?: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// ── أمر طلب مع بنوده (رأس + أسطر) ──
export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

// ── مدخلات إنشاء أمـر طلب ──
export interface CreatePurchaseOrderInput {
  project_id: string;
  number?: string;
  order_date: string;
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_address?: string | null;
  expected_delivery_date?: string | null;
  status?: PurchaseOrderStatus;
  notes?: string | null;
  tva_rate?: number | null;
  items: CreatePurchaseOrderItemInput[];
}

// ── مدخلات تحديث رأس أمـر طلب ──
export interface UpdatePurchaseOrderInput {
  order_date?: string;
  supplier_name?: string;
  supplier_phone?: string | null;
  supplier_address?: string | null;
  expected_delivery_date?: string | null;
  notes?: string | null;
  tva_rate?: number | null;
}

// ── مدخلات إنشاء بند ──
export interface CreatePurchaseOrderItemInput {
  material_id?: string | null;
  designation: string;
  unit: string;
  quantity: number;
  unit_price_ht: number;
  notes?: string | null;
  sort_order: number;
}
