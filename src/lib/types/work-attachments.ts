// ═══════════════════════════════════════════════════════════════════
// محضر قيس الأشغال (Attachement minute des travaux) - Types
// ═══════════════════════════════════════════════════════════════════

export type WorkAttachmentStatus = "draft" | "validated";

export interface WorkAttachment {
  id: string;
  project_id: string;
  attachment_number: number;
  period_start: string;           // YYYY-MM-DD
  period_end: string;             // YYYY-MM-DD
  status: WorkAttachmentStatus;
  notes?: string;
  created_by?: string;
  validated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkAttachmentItem {
  id: string;
  attachment_id: string;
  contract_item_id?: string | null;
  item_code: string;
  description: string;
  unit: string;
  contracted_qty: number;
  previous_qty: number;
  period_qty: number;
  cumulative_qty: number;
  notes?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkAttachmentWithItems extends WorkAttachment {
  items: WorkAttachmentItem[];
}

export interface CreateWorkAttachmentDto {
  project_id: string;
  period_start: string;
  period_end: string;
  notes?: string;
}

export interface UpdateWorkAttachmentItemDto {
  period_qty?: number;
  notes?: string;
}
