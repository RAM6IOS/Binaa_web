-- ═══════════════════════════════════════════════════════════════════
-- نظام تتبع المواد (Materials Inventory) - Migration
-- ═══════════════════════════════════════════════════════════════════

-- ── جدول المواد / Materials Table ──
CREATE TABLE IF NOT EXISTS materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                    -- اسم المادة
  unit          TEXT NOT NULL DEFAULT 'kgs',      -- الوحدة: kgs, tonnes, m3, m, piece, other
  initial_quantity NUMERIC NOT NULL DEFAULT 0,    -- الكمية الأولية / المتوفرة
  unit_price    NUMERIC NOT NULL DEFAULT 0,       -- السعر الوحدوي
  notes         TEXT,                             -- ملاحظات
  created_by    UUID NOT NULL,                    -- الصانع
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── فهارس ──
CREATE INDEX IF NOT EXISTS idx_materials_project_id ON materials(project_id);

-- ── جدول استهلاك المواد / Material Consumptions Table ──
-- يُستخدم لتسجيل الاستهلاك اليومي (للاحقاً)
CREATE TABLE IF NOT EXISTS material_consumptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  daily_log_id  UUID REFERENCES daily_logs(id) ON DELETE SET NULL,
  quantity      NUMERIC NOT NULL,                 -- الكمية المستهلكة
  consumed_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── فهارس ──
CREATE INDEX IF NOT EXISTS idx_material_consumptions_project ON material_consumptions(project_id);
CREATE INDEX IF NOT EXISTS idx_material_consumptions_material ON material_consumptions(material_id);

-- ═══════════════════════════════════════════════════════════════════
-- RLS Policies — Multi-tenant عبر auth.uid()
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_consumptions ENABLE ROW LEVEL SECURITY;

-- ── materials policies ──

-- كل مستخدم يرى فقط مواد المشاريع التي أنشأها
CREATE POLICY "materials_select_own"
  ON materials FOR SELECT
  USING (created_by = auth.uid());

-- فقط الصانع يمكنه إنشاء مادة
CREATE POLICY "materials_insert_own"
  ON materials FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- فقط الصانع يمكنه تعديل مادته
CREATE POLICY "materials_update_own"
  ON materials FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- فقط الصانع يمكنه حذف مادته
CREATE POLICY "materials_delete_own"
  ON materials FOR DELETE
  USING (created_by = auth.uid());

-- ── material_consumptions policies ──

CREATE POLICY "consumptions_select_own"
  ON material_consumptions FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "consumptions_insert_own"
  ON material_consumptions FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "consumptions_delete_own"
  ON material_consumptions FOR DELETE
  USING (created_by = auth.uid());

-- ── updated_at trigger ──
CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_materials_updated_at();
