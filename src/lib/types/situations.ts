// ═══════════════════════════════════════════════════════════════════
// وضعية الأشغال / Situation des Travaux - Types
// ═══════════════════════════════════════════════════════════════════

export type WorkSituationStatus = "draft" | "validated";
export type WorkSituationType = "monthly" | "interim" | "final";

export interface WorkSituation {
  id: string;
  project_id: string;
  situation_number: number;
  period_start?: string;
  period_end?: string;
  arretee_au: string;
  status: WorkSituationStatus;
  situation_type: WorkSituationType;

  // Snapshots (لقطات رسمية)
  wilaya?: string;
  company_name?: string;
  company_address?: string;
  company_rc?: string;
  company_nif?: string;
  company_article?: string;
  company_rib?: string;
  company_bank?: string;
  operation_name?: string;
  project_name?: string;
  lot_number?: string;
  lot_label?: string;
  marche_visa_cm?: string;
  marche_visa_cm_date?: string;
  marche_visa_cf?: string;
  marche_visa_cf_date?: string;
  marche_amount_ttc: number;
  client_name?: string;
  maitre_oeuvre?: string;

  // Page 1 Amounts (مبالغ الصفحة 1)
  travaux_cumules: number;
  avances_forfaitaires: number;
  avances_approvisionnement: number;
  travaux_avenant: number;
  autres_montant: number;
  total_1: number;
  travaux_precedemment_certifies: number;
  avances_forfaitaires_recues: number;
  avances_appro_recues: number;
  total_2: number;
  montant_brut: number;
  montant_ht: number;
  tva_rate: number;
  tva_amount: number;
  montant_ttc: number;
  retenue_garantie_rate: number;
  retenue_garantie_amount: number;
  net_a_payer: number;
  net_a_payer_text?: string;

  // Owner section (جزء صاحب المشروع)
  penalite_retard: number;
  autre_deduction: number;
  autre_deduction_label?: string;
  montant_net_maitre_ouvrage?: number;

  notes?: string;
  created_by?: string;
  validated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkSituationItem {
  id: string;
  situation_id: string;
  contract_item_id?: string | null;
  item_code: string;
  description: string;
  unit: string;
  contracted_qty: number;
  previous_qty: number;
  period_qty: number;
  cumulative_qty: number;
  progress_percent: number;
  unit_price: number;
  period_amount: number;
  cumulative_amount: number;
  sort_order: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkSituationWithItems extends WorkSituation {
  items: WorkSituationItem[];
}

export interface CreateWorkSituationDto {
  project_id: string;
  arretee_au: string;
  period_start?: string;
  period_end?: string;
  situation_type?: WorkSituationType;
}

export interface UpdateWorkSituationFinancialsDto {
  avances_forfaitaires?: number;
  avances_approvisionnement?: number;
  travaux_avenant?: number;
  autres_montant?: number;
  avances_forfaitaires_recues?: number;
  avances_appro_recues?: number;
  tva_rate?: number;
  retenue_garantie_rate?: number;
  penalite_retard?: number;
  autre_deduction?: number;
  autre_deduction_label?: string;
  notes?: string;
  // Snapshot edits if draft
  wilaya?: string;
  company_name?: string;
  company_address?: string;
  company_rc?: string;
  company_nif?: string;
  company_article?: string;
  company_rib?: string;
  company_bank?: string;
  operation_name?: string;
  project_name?: string;
  lot_number?: string;
  lot_label?: string;
  marche_visa_cm?: string;
  marche_visa_cm_date?: string;
  marche_visa_cf?: string;
  marche_visa_cf_date?: string;
  marche_amount_ttc?: number;
  client_name?: string;
  maitre_oeuvre?: string;
}

export interface UpdateWorkSituationItemDto {
  period_qty?: number;
  unit_price?: number;
  notes?: string;
}
