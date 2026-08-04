-- ═══════════════════════════════════════════════════════════════════
-- SQL Migration for Work Situations (Situation des Travaux)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS work_situations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  situation_number INT NOT NULL,
  period_start DATE,
  period_end DATE,
  arretee_au DATE NOT NULL,
  status TEXT DEFAULT 'draft', -- draft | validated
  situation_type TEXT DEFAULT 'monthly', -- monthly | interim | final

  -- Snapshots
  wilaya TEXT,
  company_name TEXT,
  company_address TEXT,
  company_rc TEXT,
  company_nif TEXT,
  company_article TEXT,
  company_rib TEXT,
  company_bank TEXT,
  operation_name TEXT,
  project_name TEXT,
  lot_number TEXT,
  lot_label TEXT,
  marche_visa_cm TEXT,
  marche_visa_cm_date DATE,
  marche_visa_cf TEXT,
  marche_visa_cf_date DATE,
  marche_amount_ttc NUMERIC DEFAULT 0,
  client_name TEXT,
  maitre_oeuvre TEXT,

  -- Page 1 Amounts
  travaux_cumules NUMERIC DEFAULT 0,
  avances_forfaitaires NUMERIC DEFAULT 0,
  avances_approvisionnement NUMERIC DEFAULT 0,
  travaux_avenant NUMERIC DEFAULT 0,
  autres_montant NUMERIC DEFAULT 0,
  total_1 NUMERIC DEFAULT 0,
  travaux_precedemment_certifies NUMERIC DEFAULT 0,
  avances_forfaitaires_recues NUMERIC DEFAULT 0,
  avances_appro_recues NUMERIC DEFAULT 0,
  total_2 NUMERIC DEFAULT 0,
  montant_brut NUMERIC DEFAULT 0,
  montant_ht NUMERIC DEFAULT 0,
  tva_rate NUMERIC DEFAULT 19,
  tva_amount NUMERIC DEFAULT 0,
  montant_ttc NUMERIC DEFAULT 0,
  retenue_garantie_rate NUMERIC DEFAULT 5,
  retenue_garantie_amount NUMERIC DEFAULT 0,
  net_a_payer NUMERIC DEFAULT 0,
  net_a_payer_text TEXT,

  -- Owner Section
  penalite_retard NUMERIC DEFAULT 0,
  autre_deduction NUMERIC DEFAULT 0,
  autre_deduction_label TEXT,
  montant_net_maitre_ouvrage NUMERIC,

  notes TEXT,
  created_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_project_situation UNIQUE (project_id, situation_number)
);

CREATE TABLE IF NOT EXISTS work_situation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  situation_id UUID NOT NULL REFERENCES work_situations(id) ON DELETE CASCADE,
  contract_item_id UUID NULL,
  item_code TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  contracted_qty NUMERIC DEFAULT 0,
  previous_qty NUMERIC DEFAULT 0,
  period_qty NUMERIC DEFAULT 0,
  cumulative_qty NUMERIC DEFAULT 0,
  progress_percent NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  period_amount NUMERIC DEFAULT 0,
  cumulative_amount NUMERIC DEFAULT 0,
  sort_order INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE work_situations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_situation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users on work_situations" ON work_situations
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users on work_situation_items" ON work_situation_items
  FOR ALL USING (auth.role() = 'authenticated');
